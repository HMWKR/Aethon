"""Isolated consent/queue contracts; no credentials or network provider."""
import json
import hashlib
import sqlite3
import tempfile
import threading
import unittest
import uuid
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch

import chat_general
import chat_runtime
import anthropic_ontology
import contracts
import ledger
import model_selection
from app import server
from tests.test_chat_runtime import ARGS, PROMPT, Fake, response, use


class GeneralChatHTTPTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        fixtures=[response([use('plan','propose_media_plan',ARGS)],'tool_use'),response()]
        self.http=server(self.tmp.name,0,general_chat_fixture=fixtures)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start();self.addCleanup(self.shutdown)
        self.base='http://127.0.0.1:'+str(self.http.server_port)
        self.action('project',name='A',era='default',story=0)
        self.action('model_settings',song='A',selections={'chat':'anthropic-haiku-5-5'},model_revision=0)
        self.pid=contracts.project_id(self.http.store.workspace_id,'A')
        with self.http.store.connect() as c:
            ledger.patch_budget(c,self.http.store.workspace_id,'rehearsal:project:'+self.pid,
                                dict(limit={'amount':'1','currency':'USD'},maxConcurrentJobs=4,allowAutomaticRetries=False),0)
    def shutdown(self):
        self.http.shutdown();self.http.server_close();self.thread.join()
    def state(self):
        with urlopen(self.base+'/api/state') as r:return json.load(r)
    def send(self,payload):
        request=Request(self.base+'/api/action',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','X-Loretune-Token':self.state()['token']})
        try:
            with urlopen(request) as r:return r.status,json.load(r)
        except HTTPError as e:
            with e:return e.code,json.load(e)
    def session_state(self,cid):
        with urlopen(self.base+'/api/state?'+urlencode({'song':'A','conversation':cid})) as r:return json.load(r)
    def session_action(self,cid,action,**data):
        state=self.session_state(cid);active=state['projects']['A']['active_conversation']
        return self.send(dict(action=action,data=data,revision=state['revision'],request_id=uuid.uuid4().hex,
                              conversation_id=cid,conversation_revision=active['revision'],shared_version=active['shared_version']))
    def action(self,action,**data):
        return self.send(dict(action=action,data=data,revision=self.state()['revision'],request_id=uuid.uuid4().hex))
    def preview(self):
        status,result=self.action('general_chat_preview',song='A',prompt='음원에 맞는 장면을 제안해 줘',maximum_micro=10000)
        self.assertEqual(status,200,result);return result['general_chat_preview']
    def approve(self,preview,decision='approve',rights=True):
        return self.action('general_chat_decide',song='A',preview_id=preview['id'],manifest_sha256=preview['manifest_sha256'],decision=decision,rights_confirmed=rights)
    def test_preview_approval_tool_and_continuation_require_distinct_consent(self):
        first=self.preview();transport=self.http.store.general_chat_runtime.transport
        self.assertEqual((len(transport.counted),len(transport.messages)),(0,0))
        self.assertEqual(first['mode'],'contract-fake')
        self.assertEqual(first['message_sha256'],chat_general.digest(first['message_body']))
        status,result=self.approve(first);self.assertEqual(status,200,result)
        self.assertEqual(result['turn']['status'],'queued')
        self.assertTrue(self.http.store.general_chat_runtime.process_next())
        project=self.state()['projects']['A'];turn=project['general_chat_turns'][-1]
        self.assertEqual(turn['status'],'awaiting_continuation_approval',turn)
        self.assertEqual(len(project['guided_plans']),1)
        self.assertEqual(project['guided_plans'][0]['status'],'proposed')
        self.assertEqual(transport.counted,[first['count_body']]);self.assertEqual(transport.messages,[first['message_body']])
        second=project['general_chat_previews'][-1]
        self.assertIn('tool_result',json.dumps(second['message_body']))
        self.assertEqual(len(transport.messages),1)
        status,result=self.approve(second);self.assertEqual(status,200,result)
        self.assertTrue(self.http.store.general_chat_runtime.process_next())
        turn=self.state()['projects']['A']['general_chat_turns'][-1]
        self.assertEqual(turn['status'],'completed',turn);self.assertFalse(turn['billing_confirmed'])
        self.assertEqual(transport.messages[-1],second['message_body']);self.assertEqual(len(transport.messages),2)
    def test_reject_missing_rights_and_stale_context_do_not_send(self):
        first=self.preview();status,_=self.approve(first,rights=False);self.assertEqual(status,400)
        status,_=self.approve(first,'reject');self.assertEqual(status,200)
        self.assertFalse(self.http.store.general_chat_runtime.transport.counted)
        second=self.preview();self.action('shot',song='A',shot='changed',description='changed')
        status,_=self.approve(second);self.assertEqual(status,400)
        self.assertFalse(self.http.store.general_chat_runtime.transport.counted)
    def test_same_request_id_replay_is_idempotent_and_other_request_cannot_consume(self):
        first=self.preview();payload=dict(action='general_chat_decide',data=dict(song='A',preview_id=first['id'],manifest_sha256=first['manifest_sha256'],decision='approve',rights_confirmed=True),revision=self.state()['revision'],request_id=uuid.uuid4().hex)
        status,result=self.send(payload);self.assertEqual(status,200,result)
        status,again=self.send(payload);self.assertEqual(status,200);self.assertEqual(again,result)
        status,_=self.approve(first);self.assertEqual(status,400)
        self.assertEqual(len(self.state()['projects']['A']['general_chat_turns']),1)
    def test_competing_approvals_consume_once_and_reserve_once(self):
        first=self.preview();revision=self.state()['revision']
        def submit(_):
            return self.send(dict(action='general_chat_decide',data=dict(song='A',preview_id=first['id'],manifest_sha256=first['manifest_sha256'],decision='approve',rights_confirmed=True),revision=revision,request_id=uuid.uuid4().hex))[0]
        with ThreadPoolExecutor(2) as pool:statuses=list(pool.map(submit,range(2)))
        self.assertEqual(statuses.count(200),1);self.assertTrue(all(x in {200,400,409} for x in statuses))
        with self.http.store.connect() as c:
            self.assertEqual(c.execute('SELECT count(*) FROM general_chat_turns').fetchone()[0],1)
            self.assertEqual(c.execute('SELECT count(*) FROM reservations').fetchone()[0],1)
    def test_changed_rights_and_tampered_manifest_do_not_send(self):
        first=self.preview()
        with self.http.store.connect() as c:
            c.execute('INSERT INTO asset_rights VALUES (?,?,?,?)',('a'*64,1,'changed',1))
        status,_=self.approve(first);self.assertEqual(status,400)
        second=self.preview();second['manifest_sha256']='0'*64
        status,_=self.approve(second);self.assertEqual(status,400)
        self.assertEqual(self.http.store.general_chat_runtime.transport.counted,[])
    def test_budget_change_and_reservation_error_roll_back_grant_and_turn(self):
        first=self.preview()
        with self.http.store.connect() as c:
            ledger.patch_budget(c,self.http.store.workspace_id,'rehearsal:project:'+self.pid,
                                dict(limit={'amount':'2','currency':'USD'},maxConcurrentJobs=4,allowAutomaticRetries=False),1)
        status,_=self.approve(first);self.assertEqual(status,400)
        second=self.preview()
        req=dict(action='general_chat_decide',data=dict(song='A',preview_id=second['id'],manifest_sha256=second['manifest_sha256'],decision='approve',rights_confirmed=True),revision=self.state()['revision'],request_id=uuid.uuid4().hex)
        with patch.object(chat_general.ledger,'command',side_effect=sqlite3.OperationalError('fixture reservation failure')):
            with self.assertRaises(sqlite3.OperationalError):self.http.store.mutate(req)
        with self.http.store.connect() as c:
            self.assertEqual(chat_general.get_row(c,'general_chat_previews',second['id'])['state'],'pending')
            self.assertEqual(c.execute('SELECT count(*) FROM general_chat_turns').fetchone()[0],0)
            self.assertEqual(c.execute('SELECT count(*) FROM reservations').fetchone()[0],0)
        self.assertEqual(self.http.store.general_chat_runtime.transport.counted,[])
    def test_unknown_and_restart_keep_reservation_and_block_repeat(self):
        self.http.store.general_chat_runtime.transport.responses=['__unknown__']
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        self.assertTrue(self.http.store.general_chat_runtime.process_next())
        turn=self.state()['projects']['A']['general_chat_turns'][-1];self.assertEqual(turn['status'],'outcome_unknown')
        with self.http.store.connect() as c:
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'uncertain')
            chat_general.recover(c)
        status,_=self.action('general_chat_preview',song='A',prompt='다시 요청',maximum_micro=10000)
        self.assertEqual(status,400);self.assertFalse(self.http.store.general_chat_runtime.process_next())
        self.assertEqual(len(self.http.store.general_chat_runtime.transport.messages),1)
    def test_over_limit_usage_keeps_actual_and_no_tool_call(self):
        upstream=response([use('plan','propose_media_plan',ARGS)],'tool_use');upstream['usage']={'input_tokens':100,'output_tokens':100000}
        self.http.store.general_chat_runtime.transport.responses=[upstream]
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        self.http.store.general_chat_runtime.process_next()
        project=self.state()['projects']['A'];self.assertEqual(project['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertEqual(project['general_chat_turns'][-1]['usage']['output_tokens'],100000)
        self.assertFalse(project.get('guided_plans'))
        with self.http.store.connect() as c:self.assertEqual(c.execute('SELECT state,actual FROM reservations').fetchone(),('disputed',50010))
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
    def test_other_conversation_cannot_view_or_consume_preview(self):
        first=self.preview();status,result=self.action('conversation_create',song='A',title='다른 대화')
        self.assertEqual(status,200,result);cid=result['conversation']['id']
        self.assertEqual(self.session_state(cid)['projects']['A']['general_chat_previews'],[])
        status,_=self.session_action(cid,'general_chat_decide',song='A',preview_id=first['id'],manifest_sha256=first['manifest_sha256'],decision='approve',rights_confirmed=True)
        self.assertEqual(status,400);self.assertEqual(self.http.store.general_chat_runtime.transport.counted,[])
    def test_restart_running_request_marks_uncertain_without_resubmission(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result);identifier=result['turn']['id']
        with self.http.store.connect() as c:
            turn=chat_general.get_row(c,'general_chat_turns',identifier);turn['status']='running';chat_general.put(c,'general_chat_turns',turn)
            chat_general.recover(c)
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'uncertain')
        self.assertEqual(self.state()['projects']['A']['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertFalse(self.http.store.general_chat_runtime.process_next());self.assertEqual(self.http.store.general_chat_runtime.transport.messages,[])
    def test_cancel_queued_releases_reservation_without_call(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        status,result=self.action('general_chat_cancel',song='A',turn=result['turn']['id']);self.assertEqual(status,200,result)
        self.assertEqual(result['general_chat_turn']['status'],'cancelled')
        with self.http.store.connect() as c:self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'cancelled')
        self.assertFalse(self.http.store.general_chat_runtime.process_next());self.assertEqual(self.http.store.general_chat_runtime.transport.messages,[])
        run=next(r for r in self.state()['projects']['A']['production_runs'] if r['id']==result['general_chat_turn'].get('run')) if result['general_chat_turn'].get('run') else self.state()['projects']['A']['production_runs'][-1]
        self.assertEqual(run['state'],'cancelled')

    def test_model_change_is_blocked_until_general_turn_resolved(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        project=self.state()['projects']['A'];model_revision=project['active_conversation']['model_revision']
        status,_=self.action('conversation_model',song='A',selection='xai-grok-4-7',model_revision=model_revision)
        self.assertEqual(status,400)
        status,_=self.action('model_settings',song='A',selections={'chat':'xai-grok-4-7'},model_revision=project['model_settings']['revision'])
        self.assertEqual(status,400)
        project=self.state()['projects']['A']
        self.assertEqual(project['general_chat_turns'][-1]['status'],'queued')
        self.assertEqual(project['active_conversation']['model_revision'],model_revision)
        status,_=self.action('general_chat_cancel',song='A',turn=result['turn']['id']);self.assertEqual(status,200)
        status,_=self.action('conversation_model',song='A',selection='xai-grok-4-7',model_revision=model_revision)
        self.assertEqual(status,200)

    def test_running_model_change_does_not_invalidate_approved_reply(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        transport=self.http.store.general_chat_runtime.transport
        transport.responses=[response()];original=transport.complete
        ready=threading.Event();resume=threading.Event()
        def pause(body):
            ready.set()
            if not resume.wait(10):raise TimeoutError('test synchronization failed')
            return original(body)
        with patch.object(transport,'complete',side_effect=pause):
            worker=threading.Thread(target=self.http.store.general_chat_runtime.process_next);worker.start()
            try:
                self.assertTrue(ready.wait(10))
                project=self.state()['projects']['A'];model_revision=project['active_conversation']['model_revision']
                status,_=self.action('conversation_model',song='A',selection='xai-grok-4-7',model_revision=model_revision)
                self.assertEqual(status,400)
                status,_=self.action('model_settings',song='A',selections={'chat':'xai-grok-4-7'},model_revision=project['model_settings']['revision'])
                self.assertEqual(status,400)
            finally:
                resume.set();worker.join(10)
            self.assertFalse(worker.is_alive())
        project=self.state()['projects']['A'];self.assertEqual(project['general_chat_turns'][-1]['status'],'completed')
        self.assertEqual(project['production_runs'][-1]['state'],'completed')
        status,_=self.action('conversation_model',song='A',selection='xai-grok-4-7',model_revision=model_revision)
        self.assertEqual(status,200)
    def connect_synthetic(self):
        project=self.state()['projects']['A']
        approval=dict(model=anthropic_ontology.MODEL,workspace_id=self.http.store.workspace_id,project_id=self.pid,synthetic_only=True,expires=time.time()+300,
                      context_hash=model_selection.snapshot(project)['sha256'],prompt_hashes=[hashlib.sha256(PROMPT.encode()).hexdigest()],price_revision='haiku-5-5-20261027-tiered',max_rounds=2)
        self.http.store.chat_runtime=chat_runtime.ChatRuntime(self.http.store,Fake([response()]),approval,self.tmp.name+'/synthetic.sqlite3')
    def test_synthetic_and_general_queues_block_each_other(self):
        self.connect_synthetic();status,result=self.action('chat_turn',song='A',prompt=PROMPT);self.assertEqual(status,200,result)
        status,_=self.action('general_chat_preview',song='A',prompt='새 요청',maximum_micro=10000);self.assertEqual(status,400)
        status,result=self.action('chat_cancel',song='A',turn=result['chat_turn']['id']);self.assertEqual(status,200,result)
        preview=self.preview();status,result=self.approve(preview);self.assertEqual(status,200,result)
        status,_=self.action('chat_turn',song='A',prompt=PROMPT);self.assertEqual(status,400)
    def test_settlement_failure_keeps_unknown_and_no_new_tool_or_message(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        original=ledger.command
        def fail_settle(c,workspace,scope,kind,data,key):
            if kind=='settle':raise sqlite3.OperationalError('fixture journal failure')
            return original(c,workspace,scope,kind,data,key)
        with patch.object(chat_general.ledger,'command',side_effect=fail_settle):self.http.store.general_chat_runtime.process_next()
        project=self.state()['projects']['A'];self.assertEqual(project['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertFalse(project.get('guided_plans'))
        with self.http.store.connect() as c:self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'uncertain')
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
    def test_persistent_ledger_failure_records_unknown_and_preserves_reservation(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        with patch.object(chat_general.ledger,'command',side_effect=sqlite3.OperationalError('ledger unavailable')):
            self.assertTrue(self.http.store.general_chat_runtime.process_next())
        project=self.state()['projects']['A'];turn=project['general_chat_turns'][-1]
        self.assertEqual(turn['status'],'outcome_unknown')
        self.assertEqual(turn['journal_failure'],'update_failed')
        self.assertFalse(project.get('guided_plans'))
        with self.http.store.connect() as c:
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'reserved')
            chat_general.recover(c)
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'reserved')
        self.assertEqual(self.state()['projects']['A']['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
        self.assertEqual(len(self.http.store.general_chat_runtime.transport.messages),1)

    def test_cancel_after_settlement_before_tool_does_not_create_proposal(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        identifier=result['turn']['id'];ready=threading.Event();resume=threading.Event()
        original=chat_general.chat_protocols.normalize
        def pause_after_response(*args,**kwargs):
            value=original(*args,**kwargs);ready.set()
            if not resume.wait(10):raise TimeoutError('test synchronization failed')
            return value
        with patch.object(chat_general.chat_protocols,'normalize',side_effect=pause_after_response):
            worker=threading.Thread(target=self.http.store.general_chat_runtime.process_next)
            worker.start()
            try:
                self.assertTrue(ready.wait(10))
                status,result=self.action('general_chat_cancel',song='A',turn=identifier)
                self.assertEqual(status,200,result)
                self.assertEqual(result['general_chat_turn']['status'],'cancel_requested')
            finally:
                resume.set();worker.join(10)
            self.assertFalse(worker.is_alive())
        project=self.state()['projects']['A']
        self.assertFalse(project.get('guided_plans'))
        self.assertEqual(project['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
        self.assertEqual(len(self.http.store.general_chat_runtime.transport.messages),1)

    def test_cancel_after_tool_preparation_is_checked_in_tool_transaction(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        identifier=result['turn']['id'];ready=threading.Event();resume=threading.Event()
        original=self.http.store.mutate
        def pause_tool(request):
            if request['action']=='production_tool':
                ready.set()
                if not resume.wait(10):raise TimeoutError('test synchronization failed')
                # Model the worker obtaining fresh metadata after cancellation;
                # revision freshness alone must not permit the cancelled call.
                current=self.state();project=current['projects']['A'];session=project['active_conversation']
                request['revision']=current['revision'];request['conversation_revision']=session['revision'];request['shared_version']=session['shared_version']
            return original(request)
        with patch.object(self.http.store,'mutate',side_effect=pause_tool):
            worker=threading.Thread(target=self.http.store.general_chat_runtime.process_next);worker.start()
            try:
                self.assertTrue(ready.wait(10))
                status,result=self.action('general_chat_cancel',song='A',turn=identifier)
                self.assertEqual(status,200,result)
            finally:
                resume.set();worker.join(10)
            self.assertFalse(worker.is_alive())
        project=self.state()['projects']['A']
        self.assertFalse(project.get('guided_plans'))
        self.assertEqual(project['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertEqual(project['production_runs'][-1]['state'],'outcome_unknown')

    def test_restart_with_ledger_failure_preserves_unknown_and_held_amount(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        identifier=result['turn']['id']
        with self.http.store.connect() as c:
            turn=chat_general.get_row(c,'general_chat_turns',identifier);turn['status']='running';chat_general.put(c,'general_chat_turns',turn)
            with patch.object(chat_general.ledger,'command',side_effect=sqlite3.OperationalError('ledger unavailable')):
                chat_general.recover(c)
            turn=chat_general.get_row(c,'general_chat_turns',identifier)
            self.assertEqual((turn['status'],turn['journal_failure']),('outcome_unknown','update_failed'))
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'reserved')
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
        self.assertEqual(self.http.store.general_chat_runtime.transport.messages,[])

    def test_turn_storage_failure_propagates_and_restart_recovers(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        identifier=result['turn']['id'];original_put=chat_general.put
        def fail_unknown(c,table,item):
            if table=='general_chat_turns' and item['status']=='outcome_unknown':raise sqlite3.OperationalError('turn storage unavailable')
            return original_put(c,table,item)
        with patch.object(chat_general.ledger,'command',side_effect=sqlite3.OperationalError('ledger unavailable')),patch.object(chat_general,'put',side_effect=fail_unknown):
            with self.assertRaises(sqlite3.OperationalError):self.http.store.general_chat_runtime.process_next()
        with self.http.store.connect() as c:
            self.assertEqual(chat_general.get_row(c,'general_chat_turns',identifier)['status'],'running')
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'reserved')
            chat_general.recover(c)
            self.assertEqual(chat_general.get_row(c,'general_chat_turns',identifier)['status'],'outcome_unknown')
            self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'uncertain')
        self.assertFalse(self.http.store.general_chat_runtime.process_next())
        self.assertEqual(len(self.http.store.general_chat_runtime.transport.messages),1)
    def test_rights_changed_after_queue_blocks_count_and_releases_reservation(self):
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        with self.http.store.connect() as c:c.execute('INSERT INTO asset_rights VALUES (?,?,?,?)',('b'*64,1,'changed',2))
        self.assertTrue(self.http.store.general_chat_runtime.process_next())
        turn=self.state()['projects']['A']['general_chat_turns'][-1];self.assertEqual(turn['status'],'blocked_before_message')
        with self.http.store.connect() as c:self.assertEqual(c.execute('SELECT state FROM reservations').fetchone()[0],'cancelled')
        self.assertEqual(self.http.store.general_chat_runtime.transport.counted,[])
    def test_private_reasoning_is_not_saved_or_sent_in_a_continuation(self):
        secret='fixture-private-reasoning-canary'
        upstream=response([dict(type='thinking',thinking=secret),use('plan','propose_media_plan',ARGS)],'tool_use')
        self.http.store.general_chat_runtime.transport.responses=[upstream]
        first=self.preview();status,result=self.approve(first);self.assertEqual(status,200,result)
        self.http.store.general_chat_runtime.process_next()
        project=self.state()['projects']['A'];self.assertEqual(project['general_chat_turns'][-1]['status'],'outcome_unknown')
        self.assertFalse(project.get('guided_plans'));self.assertNotIn(secret,json.dumps(project))
        self.assertNotIn(secret,(self.http.store.db).read_bytes().decode('latin1'))
        self.assertEqual(len(self.http.store.general_chat_runtime.transport.messages),1)
