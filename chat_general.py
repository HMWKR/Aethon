"""Disabled-by-default, consent-scoped chat rehearsal. No network transport.

This module is a local contract exercise, not an enabled Claude connection.
Every counted/message body is approved separately and the fake adapter below
cannot access credentials or a network endpoint.
"""
import hashlib
import json
import time
import uuid
from copy import deepcopy
from decimal import Decimal, ROUND_CEILING

import chat_models
import chat_protocols
import chat_runtime
import chat_sessions
import contracts
import guided
import ledger
import model_selection
import production_tools

TTL_SECONDS = 300
MAX_INPUT = 4096
MAX_OUTPUT = 4096
MAX_ROUNDS = 4
ALLOWED_TOOLS = ('propose_media_plan',)


def initialize(c):
    c.execute('CREATE TABLE IF NOT EXISTS general_chat_previews (id TEXT PRIMARY KEY, project TEXT NOT NULL, conversation TEXT NOT NULL, body TEXT NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS general_chat_turns (id TEXT PRIMARY KEY, project TEXT NOT NULL, conversation TEXT NOT NULL, body TEXT NOT NULL)')


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


class FixtureTransport:
    """An in-memory response fixture. It has no endpoint, credentials or I/O."""
    mode = 'contract-fake'
    def __init__(self, responses):
        self.responses = deepcopy(responses)
        self.counted = []
        self.messages = []
    def count(self, body):
        self.counted.append(deepcopy(body))
        return 100
    def complete(self, body):
        self.messages.append(deepcopy(body))
        if not self.responses: raise ValueError('fixture response unavailable')
        value = self.responses.pop(0)
        if value == '__unknown__': raise TimeoutError('fixture timeout')
        return deepcopy(value)


def selected(p):
    result = model_selection.resolve('chat', explicit=chat_sessions.selected_chat(p))['selection']
    if not result or result['provider'] != 'anthropic': raise ValueError('선택된 Claude 모델이 필요합니다.')
    return chat_models.contract(result['id'])


def rights_snapshot(c):
    return digest(c.execute('SELECT sha256,blocked,reason,updated FROM asset_rights ORDER BY sha256').fetchall())


def binding(c, store, p, name):
    spec = selected(p)
    return dict(workspace=store.workspace_id, project=contracts.project_id(store.workspace_id, name),
                conversation=chat_sessions.current(p), selection=spec['id'], model=spec['model'],
                model_revision=chat_sessions.resolve(p, chat_sessions.current(p))['model_revision'],
                context=model_selection.snapshot(p)['sha256'], rights=rights_snapshot(c),
                price_revision=spec['price_revision'])


def get_row(c, table, identifier):
    if table not in {'general_chat_previews', 'general_chat_turns'}: raise ValueError('invalid table')
    row = c.execute('SELECT body FROM '+table+' WHERE id=?', (identifier,)).fetchone()
    if not row: raise ValueError('대화 확인 항목이 없습니다.')
    return json.loads(row[0])


def put(c, table, item):
    if table not in {'general_chat_previews', 'general_chat_turns'}: raise ValueError('invalid table')
    c.execute('INSERT INTO '+table+' VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
              (item['id'], item['binding']['project'], item['binding']['conversation'], json.dumps(item, ensure_ascii=False)))


def public_preview(item):
    return {k: deepcopy(item[k]) for k in ('id','state','binding','message_body','count_body','message_sha256','count_sha256','manifest_sha256','maximum_micro','reserve_micro','expires','data_scope','destination','tool_scope','mode','turn_id')}


def manifest_digest(item):
    return digest({k:item[k] for k in ('id','binding','message_body','count_body','message_sha256','count_sha256',
                                       'maximum_micro','reserve_micro','budget_revision','expires','data_scope','destination','tool_scope','mode','prompt','parent_turn_id')})


def public_turn(item):
    return {k: deepcopy(item.get(k)) for k in ('id','conversation_id','status','mode','model','prompt','answer','error','round','preview_id','usage','usage_cost_usd','billing_confirmed','steps','journal_failure')}


def finish_run(project, turn, status):
    run=next((r for r in project.get('production_runs',[]) if r['id']==turn['run']),None)
    if run:
        run['state']=status
        run['live_model_called']=False


def close_run(c, turn, status):
    revision,body=c.execute('SELECT revision,body FROM state WHERE id=1').fetchone()
    state=json.loads(body);project=state['projects'].get(turn['name'])
    if project:
        finish_run(project,turn,status)
        c.execute('UPDATE state SET revision=?,body=? WHERE id=1',(revision+1,json.dumps(state,ensure_ascii=False)))


def claim_tool(c, store, project_id, run_id, call, request_id):
    """Guard a general-chat tool in the same transaction as its side effect."""
    rows=c.execute('SELECT body FROM general_chat_turns WHERE project=?',(project_id,)).fetchall()
    turns=[json.loads(row[0]) for row in rows if json.loads(row[0]).get('run')==run_id]
    if not turns:return  # Other, pre-existing production runs keep their contract.
    if len(turns)!=1 or store.general_chat_runtime is None:raise ValueError('도구 실행 문맥을 확인하세요.')
    turn=turns[0];preview=get_row(c,'general_chat_previews',turn['preview_id'])
    store.general_chat_runtime._current(c,turn,preview)
    expected=turn.get('pending_tool')
    if (not isinstance(expected,dict) or expected.get('call')!=call or expected.get('request_id')!=request_id or
        call.get('name') not in ALLOWED_TOOLS or call.get('name') not in preview['tool_scope']):
        raise ValueError('승인된 도구 요청이 아닙니다.')
    turn.pop('pending_tool',None);put(c,'general_chat_turns',turn)


def create_preview(c, store, p, name, prompt, maximum_micro, *, turn=None, history=None):
    if not isinstance(prompt,str) or not 1 <= len(prompt.strip()) <= 2000: raise ValueError('대화 입력을 확인하세요.')
    if type(maximum_micro) is not int or not 1 <= maximum_micro <= 100000: raise ValueError('요청 비용 상한을 확인하세요.')
    bound = binding(c,store,p,name); spec=selected(p)
    definitions=[d for d in chat_protocols.tool_definitions('anthropic') if d['name'] in ALLOWED_TOOLS]
    for item in definitions:item['strict']=True
    body=chat_models.body(spec, history if history is not None else [dict(role='user',content=prompt)], definitions, MAX_OUTPUT)
    count={k:deepcopy(v) for k,v in body.items() if k!='max_tokens'}
    worst=int((chat_models.cost(spec,MAX_INPUT,MAX_OUTPUT)*1000000).to_integral_value(rounding=ROUND_CEILING))
    if worst>maximum_micro: raise ValueError('요청 상한이 최대 예약액보다 작습니다.')
    scope='rehearsal:project:'+bound['project']
    budget=ledger.budget(c,store.workspace_id,scope)
    if not budget: raise ValueError('테스트 예산이 필요합니다.')
    item=dict(id=uuid.uuid4().hex,state='pending',binding=bound,message_body=body,count_body=count,
              message_sha256=digest(body),count_sha256=digest(count),maximum_micro=maximum_micro,
              reserve_micro=worst,budget_revision=budget['revision'],expires=time.time()+TTL_SECONDS,
              data_scope='입력한 대화 및 이 미리보기에 표시된 도구 결과만 포함; 자산 파일은 전송하지 않음',
              destination='test-fixture-no-network',tool_scope=list(ALLOWED_TOOLS),mode='contract-fake',
              turn_id=turn['id'] if turn else None,parent_turn_id=turn['id'] if turn else None,prompt=prompt)
    item['manifest_sha256']=manifest_digest(item)
    put(c,'general_chat_previews',item)
    return public_preview(item)


def preview(c, store, p, name, data):
    if set(data)!={'song','prompt','maximum_micro'}: raise ValueError('대화 입력과 비용 상한만 지정하세요.')
    if any(json.loads(r[0])['status'] in {'queued','running','outcome_unknown','cancel_requested','awaiting_continuation_approval'}
           for r in c.execute('SELECT body FROM general_chat_turns WHERE project=? AND conversation=?',
                              (contracts.project_id(store.workspace_id,name),chat_sessions.current(p)))):
        raise ValueError('기존 대화 결과를 먼저 확인하세요.')
    if any(json.loads(r[0])['status'] in {'queued','running','outcome_unknown','cancel_requested'} and
           (json.loads(r[0]).get('conversation_id') or chat_sessions.default_id(p))==chat_sessions.current(p)
           for r in c.execute('SELECT body FROM chat_turns WHERE project=?',(contracts.project_id(store.workspace_id,name),))):
        raise ValueError('기존 대화 결과를 먼저 확인하세요.')
    return create_preview(c,store,p,name,data['prompt'],data['maximum_micro'])


def decide(c, store, p, name, data):
    if set(data)!={'song','preview_id','manifest_sha256','decision','rights_confirmed'} or data['decision'] not in {'approve','reject'} or type(data['rights_confirmed']) is not bool:
        raise ValueError('전송 승인 입력을 확인하세요.')
    item=get_row(c,'general_chat_previews',data['preview_id'])
    if item['binding']['project']!=contracts.project_id(store.workspace_id,name) or item['binding']['conversation']!=chat_sessions.current(p):
        raise ValueError('다른 작품 또는 대화의 확인 항목입니다.')
    if item['state']!='pending':raise ValueError('이미 처리된 승인입니다.')
    if data['manifest_sha256']!=item['manifest_sha256'] or manifest_digest(item)!=item['manifest_sha256']:raise ValueError('확인한 전송 내용이 변경됐습니다.')
    if data['decision']=='reject':
        item['state']='rejected';put(c,'general_chat_previews',item)
        if item['turn_id']:
            turn=get_row(c,'general_chat_turns',item['turn_id']);turn['status']='continuation_rejected';put(c,'general_chat_turns',turn);finish_run(p,turn,turn['status'])
        return dict(preview=public_preview(item),turn=None)
    if not data['rights_confirmed']:raise ValueError('전송할 내용의 사용 권한 확인이 필요합니다.')
    if item['expires']<=time.time() or binding(c,store,p,name)!=item['binding']:raise ValueError('확인한 문맥이 변경됐습니다. 다시 확인하세요.')
    if digest(item['message_body'])!=item['message_sha256'] or digest(item['count_body'])!=item['count_sha256']:raise ValueError('전송 내용이 변경됐습니다.')
    if item['turn_id']:
        turn=get_row(c,'general_chat_turns',item['turn_id'])
        if turn['status']!='awaiting_continuation_approval' or turn['preview_id']!=item['id']:raise ValueError('이어쓰기 상태가 변경됐습니다.')
    else:
        if any(json.loads(r[0])['status'] in {'queued','running','outcome_unknown','cancel_requested','awaiting_continuation_approval'}
               for r in c.execute('SELECT body FROM general_chat_turns WHERE project=? AND conversation=?',(item['binding']['project'],item['binding']['conversation']))):
            raise ValueError('기존 대화 결과를 먼저 확인하세요.')
        if any(json.loads(r[0])['status'] in {'queued','running','outcome_unknown','cancel_requested'} and
               (json.loads(r[0]).get('conversation_id') or chat_sessions.default_id(p))==chat_sessions.current(p)
               for r in c.execute('SELECT body FROM chat_turns WHERE project=?',(item['binding']['project'],))):
            raise ValueError('기존 대화 결과를 먼저 확인하세요.')
        run=production_tools.begin(p)
        p['production_runs'][-1].update(engine='contract-fake',provider_model=item['binding']['model'])
        turn=dict(id=uuid.uuid4().hex,binding=deepcopy(item['binding']),conversation_id=item['binding']['conversation'],
                  name=name,run=run['id'],prompt=item['prompt'],status='queued',mode='contract-fake',model=item['binding']['model'],
                  round=0,preview_id=item['id'],answer=None,error=None,usage=None,usage_cost_usd='0',billing_confirmed=False,steps=[])
        p.setdefault('conversation_owners',{})[turn['id']]=dict(conversation_id=turn['conversation_id'],kind='general_chat_turns')
    scope='rehearsal:project:'+item['binding']['project']
    reserved=ledger.command(c,store.workspace_id,scope,'reserve',
        dict(money={'amount':format(Decimal(item['reserve_micro'])/1000000,'.6f'),'currency':'USD'},budget_revision=item['budget_revision'],expires=item['expires'],job=turn['id']),item['id'])
    item.update(state='consumed',turn_id=turn['id'],reservation=reserved['reservation'],rights_confirmed=True)
    turn.update(status='queued',preview_id=item['id'],reservation=reserved['reservation'])
    put(c,'general_chat_previews',item);put(c,'general_chat_turns',turn)
    return dict(preview=public_preview(item),turn=public_turn(turn))


def recover(c):
    for row in c.execute('SELECT body FROM general_chat_turns').fetchall():
        turn=json.loads(row[0])
        if turn['status'] in {'running','cancel_requested'}:
            turn.update(status='outcome_unknown',error='중단된 요청과 예산 예약을 확인하세요. 자동 재호출하지 않습니다.')
            turn.pop('pending_tool',None)
            scope='rehearsal:project:'+turn['binding']['project']
            reservation=c.execute('SELECT state FROM reservations WHERE id=?',(turn['reservation'],)).fetchone()
            if reservation and reservation[0]=='reserved':
                c.execute('SAVEPOINT general_chat_ledger_recover')
                try:ledger.command(c,turn['binding']['workspace'],scope,'uncertain',{'reservation':turn['reservation']},turn['id']+':restart:'+str(turn['round']))
                except Exception:
                    c.execute('ROLLBACK TO general_chat_ledger_recover');turn['journal_failure']='update_failed'
                finally:c.execute('RELEASE general_chat_ledger_recover')
            put(c,'general_chat_turns',turn);close_run(c,turn,turn['status'])


def cancel(c,store,p,name,data):
    if set(data)!={'song','turn'}:raise ValueError('대화 작업 식별자를 확인하세요.')
    turn=get_row(c,'general_chat_turns',data['turn'])
    if turn['binding']['project']!=contracts.project_id(store.workspace_id,name) or turn['conversation_id']!=chat_sessions.current(p):raise ValueError('다른 대화의 작업입니다.')
    if turn['status']=='queued':
        ledger.command(c,store.workspace_id,'rehearsal:project:'+turn['binding']['project'],'release',
                       {'reservation':turn['reservation']},turn['id']+':cancel:'+str(turn['round']))
        turn['status']='cancelled'
    elif turn['status']=='running':turn['status']='cancel_requested'
    elif turn['status']=='awaiting_continuation_approval':
        following=get_row(c,'general_chat_previews',turn['preview_id']);following['state']='rejected';put(c,'general_chat_previews',following)
        turn['status']='cancelled'
    if turn['status']=='cancelled':finish_run(p,turn,turn['status'])
    put(c,'general_chat_turns',turn)
    return public_turn(turn)


class Runtime:
    def __init__(self, store, transport):
        if type(transport) is not FixtureTransport: raise ValueError('테스트 전용 전송만 허용됩니다.')
        self.store=store;self.transport=transport

    def capability(self):
        return dict(available=True, mode='contract-fake', external_transmission=False,
                    reason='테스트 계약: 실제 Claude 연결 아님')

    def _current(self,c,turn,preview):
        state=json.loads(c.execute('SELECT body FROM state WHERE id=1').fetchone()[0]);p=state['projects'].get(turn['name'])
        if not p or p.get('archived'): raise ValueError('작품이 없습니다.')
        if (preview['state']!='consumed' or preview['turn_id']!=turn['id'] or turn['preview_id']!=preview['id'] or
            turn['reservation']!=preview.get('reservation') or turn['binding']!=preview['binding']):
            raise ValueError('승인과 실행 연결이 변경됐습니다.')
        p=chat_sessions.scoped(p,turn['conversation_id'])
        if binding(c,self.store,p,turn['name'])!=preview['binding'] or preview['expires']<=time.time():raise ValueError('확인한 문맥이 변경됐습니다.')
        if manifest_digest(preview)!=preview['manifest_sha256'] or digest(preview['message_body'])!=preview['message_sha256'] or digest(preview['count_body'])!=preview['count_sha256']:raise ValueError('전송 내용이 변경됐습니다.')
        latest=get_row(c,'general_chat_turns',turn['id'])
        if latest['status']!='running':raise ValueError('작업이 취소됐습니다.')
        return p

    def process_next(self):
        with self.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            rows=c.execute('SELECT body FROM general_chat_turns ORDER BY rowid').fetchall()
            turn=next((json.loads(r[0]) for r in rows if json.loads(r[0])['status']=='queued'),None)
            if not turn:return False
            turn['status']='running';put(c,'general_chat_turns',turn)
        submitted=False
        try:
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');preview=get_row(c,'general_chat_previews',turn['preview_id']);self._current(c,turn,preview)
            tokens=self.transport.count(deepcopy(preview['count_body']))
            if type(tokens) is not int or not 0<=tokens<=MAX_INPUT:raise ValueError('입력 토큰 한도')
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');self._current(c,turn,preview)
                turn['submitted']=True;put(c,'general_chat_turns',turn)
            submitted=True
            response=self.transport.complete(deepcopy(preview['message_body']))
            usage=chat_models.usage(selected_from_binding(preview['binding']),response)
            spec=selected_from_binding(preview['binding']);cost=chat_models.cost(spec,usage['input_tokens'],usage['output_tokens'])
            amount=int((cost*1000000).to_integral_value(rounding=ROUND_CEILING))
            if amount>9_000_000_000_000_000:raise ValueError('사용량 미확정')
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');self._current(c,turn,preview)
                ledger.command(c,self.store.workspace_id,'rehearsal:project:'+turn['binding']['project'],'settle',
                    dict(reservation=turn['reservation'],money={'amount':format(Decimal(amount)/1000000,'.6f'),'currency':'USD'}),turn['id']+':settle:'+str(turn['round']))
                turn['usage']=usage;turn['usage_cost_usd']=str(Decimal(turn['usage_cost_usd'])+cost)
                turn['steps'].append(dict(round=turn['round'],usage=usage,usage_cost_usd=str(cost),message_sha256=preview['message_sha256']))
                put(c,'general_chat_turns',turn)
            if usage['input_tokens']>MAX_INPUT or usage['output_tokens']>MAX_OUTPUT:raise ValueError('보고된 사용량이 상한을 초과했습니다.')
            # A continuation preview is persisted and displayed. Never copy
            # provider private reasoning blocks into it or the local store.
            if any(block.get('type') in {'thinking','redacted_thinking'} for block in response.get('content',[]) if isinstance(block,dict)):
                raise ValueError('비공개 추론을 포함한 응답은 이어서 전송하지 않습니다.')
            normalized=chat_protocols.normalize('anthropic',response,turn['run'])
            calls=normalized['calls']
            if len(calls)>1 or any(call['name'] not in ALLOWED_TOOLS for call in calls):raise ValueError('허용되지 않은 도구 요청')
            if not calls:
                answer=chat_models.text(spec,response)
                if not answer.strip():raise ValueError('답변이 없습니다.')
                with self.store.connect() as c:
                    c.execute('BEGIN IMMEDIATE');self._current(c,turn,preview)
                    turn.update(status='completed',answer=answer);put(c,'general_chat_turns',turn);close_run(c,turn,turn['status'])
                return True
            call=calls[0]
            request_id=turn['id']+':'+str(turn['round'])+':'+call['id']
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');self._current(c,turn,preview)
                turn['pending_tool']=dict(call=deepcopy(call),request_id=request_id);put(c,'general_chat_turns',turn)
            with self.store.connect() as c:
                revision,raw=c.execute('SELECT revision,body FROM state WHERE id=1').fetchone()
                project=json.loads(raw)['projects'][turn['name']]
            session=chat_sessions.resolve(project,turn['conversation_id'])
            request=dict(action='production_tool',data=dict(song=turn['name'],run=turn['run'],call=call),
                         revision=revision,request_id=request_id,
                         conversation_id=turn['conversation_id'],conversation_revision=session['revision'],shared_version=chat_sessions.shared_fingerprint(project))
            result=self.store.mutate(request)['tool']
            turn.pop('pending_tool',None)
            if turn['round']+1>=MAX_ROUNDS:
                with self.store.connect() as c:
                    c.execute('BEGIN IMMEDIATE');self._current(c,turn,preview);turn.update(status='limit_reached');put(c,'general_chat_turns',turn);close_run(c,turn,turn['status'])
                return True
            continuation=chat_models.continuation(spec,preview['message_body']['messages'],response,
                [chat_protocols.result_message(normalized,call['id'],chat_runtime.compact_result(result),provider='anthropic',run_id=turn['run'])])
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');p=self._current(c,turn,preview)
                turn['round']+=1
                following=create_preview(c,self.store,p,turn['name'],turn['prompt'],preview['maximum_micro'],turn=turn,history=continuation)
                turn.update(status='awaiting_continuation_approval',preview_id=following['id']);put(c,'general_chat_turns',turn)
            return True
        except Exception:
            with self.store.connect() as c:
                c.execute('BEGIN IMMEDIATE');latest=get_row(c,'general_chat_turns',turn['id'])
                scope='rehearsal:project:'+turn['binding']['project']
                row=c.execute('SELECT state FROM reservations WHERE id=?',(turn['reservation'],)).fetchone()
                journal_failure=False
                if row and row[0]=='reserved':
                    c.execute('SAVEPOINT general_chat_ledger_stop')
                    try:
                        ledger.command(c,self.store.workspace_id,scope,'uncertain' if submitted else 'release',
                                       {'reservation':turn['reservation']},turn['id']+':stop:'+str(turn['round']))
                    except Exception:
                        c.execute('ROLLBACK TO general_chat_ledger_stop');journal_failure=True
                    finally:c.execute('RELEASE general_chat_ledger_stop')
                latest.update(status='outcome_unknown' if submitted or journal_failure else 'cancelled' if latest['status']=='cancel_requested' else 'blocked_before_message',
                              error='요청을 중단했습니다. 기존 결과와 비용 상태를 확인하세요. 자동 재시도하지 않습니다.')
                if journal_failure:latest['journal_failure']='update_failed'
                latest.pop('pending_tool',None)
                put(c,'general_chat_turns',latest);close_run(c,latest,latest['status'])
            return True


def selected_from_binding(bound):
    spec=chat_models.contract(bound['selection'])
    if spec['model']!=bound['model'] or spec['price_revision']!=bound['price_revision']:raise ValueError('모델 또는 가격이 변경됐습니다.')
    return spec
