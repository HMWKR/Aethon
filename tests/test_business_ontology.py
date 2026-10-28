"""Regression tests for the business and presentation knowledge graph CLI.

The fixture is an isolated copy of the authored graph with placeholder local
source files. These tests do not modify the project or verify source truth.
"""
from __future__ import annotations

import json
import importlib.util
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / 'docs' / 'knowledge' / 'ontology_tool.py'
BRIDGE = ROOT / 'docs' / 'knowledge' / 'ontology_kit_bridge.py'
BUSINESS = Path('docs/knowledge/business-plan/ontology.json')
PRESENTATION = Path('docs/knowledge/presentation/ontology.json')


class OntologyCliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='aethon-ontology-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.business = json.loads((ROOT / BUSINESS).read_text(encoding='utf-8-sig'))
        self.presentation = json.loads((ROOT / PRESENTATION).read_text(encoding='utf-8-sig'))
        # The engine only checks file existence, not the contents of these
        # resources. A minimal isolated fixture avoids copying project data.
        paths = [s.get('path') for s in self.business['sources'] + self.presentation['sources']]
        paths.extend(self.business.get('research_documents', []))
        for value in filter(None, paths):
            target = self.root / value
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('fixture source\n', encoding='utf-8')
        self.write_documents()

    def write_documents(self):
        for path, document in ((BUSINESS, self.business), (PRESENTATION, self.presentation)):
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding='utf-8')

    def run_cli(self, *args, expected=0):
        env = os.environ.copy()
        env['PYTHONDONTWRITEBYTECODE'] = '1'
        proc = subprocess.run(
            [sys.executable, str(TOOL), '--root', str(self.root), *args, '--json'],
            capture_output=True, text=True, encoding='utf-8', errors='replace', env=env,
            timeout=20,
        )
        self.assertEqual(proc.returncode, expected, f'args={args}\nstdout={proc.stdout}\nstderr={proc.stderr}')
        return json.loads(proc.stdout)

    @staticmethod
    def errors(result):
        return {entry['code'] for entry in result['errors']}

    def test_baseline_validates_and_context_has_sources_and_limitations(self):
        validation = self.run_cli('validate')
        self.assertTrue(validation['valid'])
        self.assertGreater(validation['node_count'], 0)
        self.assertEqual(validation['errors'], [])
        business = self.run_cli('context', '--task', 'business')
        self.assertEqual(business['task'], 'business')
        self.assertIn('BP-DATA-001', {n['id'] for n in business['nodes']})
        self.assertIn('BP-SRC-006', {n['id'] for n in business['nodes']})
        self.assertTrue(business['limitations'])
        pitch = self.run_cli('context', '--task', 'pitch')
        ids = {n['id'] for n in pitch['nodes']}
        self.assertIn('PPT-SLIDE-006', ids)
        self.assertIn('BP-DATA-001', ids)
        self.assertIn('BP-SRC-006', ids)

    def test_invalid_relation_types_are_rejected_and_context_blocked(self):
        self.presentation['relations'].append({
            'from': 'PPT-SLIDE-006', 'type': 'uses_claim', 'to': 'PPT-AUDIENCE-001',
        })
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('RELATION_TYPE_MISMATCH', self.errors(result))
        blocked = self.run_cli('context', '--task', 'pitch', expected=1)
        self.assertIn('RELATION_TYPE_MISMATCH', self.errors(blocked))

    def test_missing_local_source_is_rejected(self):
        source = next(s for s in self.business['sources'] if s['id'] == 'BP-SRC-002')
        (self.root / source['path']).unlink()
        result = self.run_cli('validate', expected=1)
        self.assertIn('MISSING_SOURCE_FILE', self.errors(result))

    def test_metric_must_have_source_and_unit(self):
        metric = next(c for c in self.business['concepts'] if c['id'] == 'BP-DATA-001')
        del metric['unit']
        self.business['relations'] = [r for r in self.business['relations']
                                      if not (r['from'] == 'BP-DATA-001' and r['type'] == 'supported_by')]
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('MISSING_METRIC_FIELD', self.errors(result))
        self.assertIn('MISSING_EVIDENCE', self.errors(result))

    def test_hypothesis_cannot_be_relabelled_as_verified(self):
        hypothesis = next(c for c in self.business['concepts'] if c['id'] == 'BP-HYP-001')
        hypothesis['verification'] = 'product_tested'
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('BAD_VERIFICATION', self.errors(result))

    def test_hypothesis_cannot_be_presented_as_a_confirmed_decision(self):
        claim = next(c for c in self.presentation['entities'] if c['id'] == 'PPT-CLAIM-005')
        claim['status'] = 'documented_decision'
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('CROSS_STATUS_MISMATCH', self.errors(result))

    def test_dependency_cycle_is_rejected(self):
        self.business['relations'].append({'from': 'BP-HYP-003', 'type': 'depends_on', 'to': 'BP-HYP-001'})
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('CIRCULAR_DEPENDENCY', self.errors(result))

    def test_metric_change_detected_and_impacted_slides_traced(self):
        metric = next(c for c in self.business['concepts'] if c['id'] == 'BP-DATA-001')
        metric['value'] = 32.7
        self.write_documents()
        validation = self.run_cli('validate', expected=1)
        self.assertIn('STALE_METRIC_SNAPSHOT', self.errors(validation))
        blocked = self.run_cli('context', '--task', 'pitch', expected=1)
        self.assertIn('STALE_METRIC_SNAPSHOT', self.errors(blocked))
        impact = self.run_cli('impact', 'BP-DATA-001')
        ids = {n['id'] for n in impact['nodes']}
        self.assertTrue({'BP-DATA-001', 'BP-SEC-005', 'PPT-DATA-001', 'PPT-SLIDE-006'} <= ids)
        self.assertNotIn('BP-SRC-006', ids)  # dependency, not consumer
        self.assertIn('STALE_METRIC_SNAPSHOT', {e['code'] for e in impact['validation_errors']})

    def test_source_impact_and_show_follow_opposite_directions(self):
        source_impact = self.run_cli('impact', 'BP-SRC-006')
        self.assertTrue({'BP-DATA-001', 'PPT-DATA-001', 'PPT-SLIDE-006'} <=
                        {n['id'] for n in source_impact['nodes']})
        shown = self.run_cli('show', 'PPT-SLIDE-006')
        ids = {n['id'] for n in shown['nodes']}
        self.assertTrue({'PPT-DATA-001', 'BP-DATA-001', 'BP-SRC-006'} <= ids)
        self.assertNotIn('BP-SEC-005', ids)  # another consumer

    def test_unknown_id_and_broken_target_are_reported(self):
        result = self.run_cli('impact', 'NONEXISTENT-001', expected=2)
        self.assertIn('Unknown ID', result['error'])
        self.business['relations'].append({'from': 'BP-HYP-001', 'type': 'supported_by', 'to': 'NO-SOURCE'})
        self.write_documents()
        result = self.run_cli('validate', expected=1)
        self.assertIn('BROKEN_EDGE', self.errors(result))

    def test_search_returns_matching_nodes(self):
        result = self.run_cli('search', 'BP-DATA-001')
        self.assertIn('BP-DATA-001', {node['id'] for node in result['nodes']})

    def save_context(self, task='pitch'):
        context = self.run_cli('context', '--task', task)
        path = self.root / 'context.json'
        path.write_text(json.dumps(context, ensure_ascii=False), encoding='utf-8')
        return path, context

    def test_saved_context_detects_source_change(self):
        path, context = self.save_context()
        self.assertTrue(self.run_cli('context-check', str(path))['valid'])
        local_source = next(s['path'] for s in self.presentation['sources']
                            if s.get('path') in context['receipt']['files'])
        (self.root / local_source).write_text('changed source\n', encoding='utf-8')
        checked = self.run_cli('context-check', str(path), expected=1)
        self.assertIn('STALE_FILE', self.errors(checked))

    def test_saved_context_detects_graph_change_even_when_graph_is_valid(self):
        path, _ = self.save_context()
        concept = next(c for c in self.business['concepts'] if c['id'] == 'BP-HYP-001')
        concept['description'] += ' updated'
        self.write_documents()
        self.assertTrue(self.run_cli('validate')['valid'])
        result = self.run_cli('context-check', str(path), expected=1)
        self.assertIn('STALE_FILE', self.errors(result))

    def test_context_body_and_receipt_source_set_tampering_are_detected(self):
        path, context = self.save_context()
        context['nodes'][0]['data']['title'] = 'tampered title'
        path.write_text(json.dumps(context, ensure_ascii=False), encoding='utf-8')
        self.assertIn('CONTEXT_MODIFIED', self.errors(self.run_cli('context-check', str(path), expected=1)))
        path, context = self.save_context()
        del context['receipt']['files'][str(BUSINESS).replace('\\', '/')]
        path.write_text(json.dumps(context, ensure_ascii=False), encoding='utf-8')
        self.assertIn('SOURCE_SET_CHANGED', self.errors(self.run_cli('context-check', str(path), expected=1)))


class LegacyBridgeTests(unittest.TestCase):
    def test_missing_kit_root_reports_error_without_creating_registry(self):
        with tempfile.TemporaryDirectory(prefix='aethon-bridge-test-') as directory:
            absent = Path(directory) / 'missing-kit'
            env = os.environ.copy()
            env['PYTHONDONTWRITEBYTECODE'] = '1'
            proc = subprocess.run([sys.executable, str(BRIDGE), '--kit-root', str(absent), 'status'],
                                  capture_output=True, text=True, encoding='utf-8', errors='replace', env=env, timeout=20)
            self.assertNotEqual(proc.returncode, 0)
            result = json.loads(proc.stdout or proc.stderr)
            self.assertIn('REGISTRY_MISSING', result['error'])
            self.assertFalse(result['changed'])
            self.assertFalse(absent.exists())

    def test_stale_output_and_failure_exit_code_forwarded_from_child(self):
        spec = importlib.util.spec_from_file_location('aethon_bridge_test_module', BRIDGE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        stdout = io.StringIO()
        stderr = io.StringIO()
        child = subprocess.CompletedProcess(args=[], returncode=3,
                                             stdout=b'UPSTREAM_STALE\n', stderr=b'child warning\n')
        with tempfile.TemporaryDirectory(prefix='aethon-bridge-mock-') as directory:
            with mock.patch.object(module.subprocess, 'run', return_value=child) as run, \
                 mock.patch.object(module.sys, 'stdout', stdout), mock.patch.object(module.sys, 'stderr', stderr):
                result = module.main(['--kit-root', directory, 'search', 'Aethon', '--task', 'business'])
        self.assertEqual(result, 3)
        self.assertEqual(stdout.getvalue(), 'UPSTREAM_STALE\n')
        self.assertEqual(stderr.getvalue(), 'child warning\n')
        args = run.call_args.args[0]
        self.assertIn('--root', args)
        self.assertIn('Aethon', args)
        self.assertNotIn('shell', run.call_args.kwargs)


if __name__ == '__main__':
    unittest.main()
