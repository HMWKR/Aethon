#!/usr/bin/env python3
"""Read-only validation and traversal for Aethon's business/presentation graph.

Edges point from a consumer to a dependency. Reverse traversal finds potential
impact, not automatically modified documents. This tool never reads the separate
project_kit registry or sends requests to external sources.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from collections import defaultdict, deque
from datetime import date
from pathlib import Path
from typing import Any

DEFAULT_ROOT = Path(__file__).resolve().parents[2]
BUSINESS_PATH = 'docs/knowledge/business-plan/ontology.json'
PRESENTATION_PATH = 'docs/knowledge/presentation/ontology.json'
BP_CLASSES = {'decision': 'Decision', 'evidence': 'Evidence', 'hypothesis': 'Hypothesis', 'unknown': 'Unknown', 'experiment': 'Experiment'}
BP_VERIFICATION = {
    'decision': {'user_confirmed', 'source_documented'},
    'evidence': {'source_documented', 'reported_isolated_test'},
    'hypothesis': {'unverified'}, 'unknown': {'unverified'}, 'experiment': {'not_run'},
}
PPT_TYPES = {'Purpose', 'Audience', 'Message', 'Slide', 'Claim', 'Source', 'Visual', 'Review', 'Unknown'}
PPT_STATUSES = {'documented_decision', 'reported_test', 'reported_external', 'hypothesis', 'unknown', 'proposed'}
BP_CONCEPTS = set(BP_CLASSES.values())
# Keys are namespaced because supported_by has different class domains.
RELATIONS = {
    ('business', 'supported_by'): (BP_CONCEPTS, {'Source'}),
    ('business', 'depends_on'): (BP_CONCEPTS, BP_CONCEPTS),
    ('business', 'tests'): ({'Experiment'}, {'Hypothesis'}),
    ('business', 'constrained_by'): (BP_CONCEPTS, {'Unknown'}),
    ('business', 'section_input'): ({'Section'}, BP_CONCEPTS),
    ('presentation', 'addresses'): ({'Purpose', 'Message'}, {'Audience'}),
    ('presentation', 'serves'): ({'Message', 'Slide'}, {'Purpose'}),
    ('presentation', 'conveys'): ({'Slide'}, {'Message'}),
    ('presentation', 'uses_claim'): ({'Slide', 'Message'}, {'Claim'}),
    ('presentation', 'supported_by'): ({'Claim'}, {'Source'}),
    ('presentation', 'visualizes'): ({'Visual'}, {'Slide', 'Claim'}),
    ('presentation', 'checks'): ({'Review'}, {'Claim', 'Audience'}),
    ('presentation', 'requires'): ({'Slide', 'Purpose', 'Visual', 'Review'}, {'Unknown'}),
    ('cross', 'same_topic'): ({'Claim'}, BP_CONCEPTS),
    ('cross', 'related_scope'): ({'Claim'}, BP_CONCEPTS),
    ('cross', 'related_unknown'): ({'Unknown'}, {'Unknown'}),
}
# Only semantic dependencies are acyclic; association and review edges are not.
ACYCLIC_RELATIONS = {'supported_by', 'depends_on', 'tests', 'constrained_by', 'section_input',
                     'serves', 'conveys', 'uses_claim', 'requires', 'same_topic', 'related_scope', 'related_unknown'}


def _text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _date(value: Any) -> bool:
    try:
        return isinstance(value, str) and date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _digest_object(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def _digest_file(path: Path) -> str:
    with path.open('rb') as stream:
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


class Graph:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: list[dict[str, str]] = []
        self.errors: list[dict[str, str]] = []
        self.documents: dict[str, dict[str, Any]] = {}
        self._load()

    def error(self, code: str, detail: str, node: str = '') -> None:
        self.errors.append({'code': code, 'id': node, 'detail': detail})

    def _file(self, path: str) -> Path | None:
        if not _text(path):
            return None
        candidate = (self.root / path).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError:
            return None
        return candidate

    def _read(self, path: str) -> dict[str, Any]:
        file = self._file(path)
        if file is None:
            self.error('BAD_PATH', f'Invalid repository path: {path}')
            return {}
        try:
            with file.open(encoding='utf-8-sig') as stream:
                result = json.load(stream)
            if not isinstance(result, dict):
                raise ValueError('JSON root must be an object')
            return result
        except (OSError, UnicodeError, ValueError) as exc:
            self.error('LOAD_ERROR', f'{path}: {exc}')
            return {}

    def _array(self, value: Any, label: str) -> list:
        if not isinstance(value, list):
            self.error('INVALID_ARRAY', f'{label} must be an array')
            return []
        return value

    def _register(self, item: Any, domain: str, node_class: str, section: str) -> None:
        if not isinstance(item, dict):
            self.error('INVALID_NODE', f'{domain}.{section} item must be an object')
            return
        ident = item.get('id')
        if not _text(ident):
            self.error('MISSING_ID', f'{domain}.{section} item has no ID')
            return
        if ident in self.nodes:
            self.error('DUPLICATE_ID', f'Duplicate ID {ident}', ident)
            return
        self.nodes[ident] = {'id': ident, 'domain': domain, 'class': node_class, 'data': item}
        if not _text(item.get('title')):
            self.error('MISSING_FIELD', 'title is required', ident)

    def _edge(self, domain: str, relation: Any, source: Any, target: Any) -> None:
        if not all(_text(v) for v in (relation, source, target)):
            self.error('INVALID_EDGE', f'{domain}: relation, from and to must be nonempty strings')
            return
        self.edges.append({'domain': domain, 'type': relation, 'from': source, 'to': target})

    def _load(self) -> None:
        bp, ppt = self._read(BUSINESS_PATH), self._read(PRESENTATION_PATH)
        self.documents = {'business': bp, 'presentation': ppt}
        for source in self._array(bp.get('sources'), 'business.sources'):
            self._register(source, 'business', 'Source', 'sources')
        for concept in self._array(bp.get('concepts'), 'business.concepts'):
            if not isinstance(concept, dict):
                self._register(concept, 'business', '', 'concepts')
                continue
            classification = concept.get('classification')
            cls = BP_CLASSES.get(classification, '') if isinstance(classification, str) else ''
            self._register(concept, 'business', cls, 'concepts')
        for section in self._array(bp.get('plan_sections'), 'business.plan_sections'):
            self._register(section, 'business', 'Section', 'plan_sections')
            if isinstance(section, dict):
                for target in self._array(section.get('inputs'), f"{section.get('id')}.inputs"):
                    self._edge('business', 'section_input', section.get('id'), target)
        for source in self._array(ppt.get('sources'), 'presentation.sources'):
            self._register(source, 'presentation', 'Source', 'sources')
        for entity in self._array(ppt.get('entities'), 'presentation.entities'):
            cls = entity.get('type', '') if isinstance(entity, dict) else ''
            if not isinstance(cls, str):
                cls = ''
            self._register(entity, 'presentation', cls, 'entities')
        for domain, doc in self.documents.items():
            for rel in self._array(doc.get('relations'), f'{domain}.relations'):
                if not isinstance(rel, dict):
                    self.error('INVALID_EDGE', f'{domain}.relations item must be an object')
                    continue
                self._edge(domain, rel.get('type'), rel.get('from'), rel.get('to'))
        for rel in self._array(ppt.get('external_references'), 'presentation.external_references'):
            if not isinstance(rel, dict):
                self.error('INVALID_EDGE', 'external reference must be an object')
                continue
            if rel.get('ontology') != BUSINESS_PATH:
                self.error('INVALID_EXTERNAL_ONTOLOGY', 'external reference must point to business ontology', str(rel.get('local_id', '')))
            self._edge('cross', rel.get('relation'), rel.get('local_id'), rel.get('target_id'))
        self._validate()

    def _validate(self) -> None:
        for ident, node in self.nodes.items():
            obj, domain, cls = node['data'], node['domain'], node['class']
            if cls == 'Source':
                limit = obj.get('limit') if domain == 'business' else obj.get('limitation')
                if not _text(limit):
                    self.error('MISSING_FIELD', 'Source requires a limitation', ident)
                path, url = obj.get('path'), obj.get('url')
                conversation = obj.get('kind') in {'user_confirmation', 'user_conversation'}
                if path:
                    resolved = self._file(path)
                    if resolved is None or not resolved.is_file():
                        self.error('MISSING_SOURCE_FILE', f'No repository file: {path}', ident)
                elif url:
                    if not isinstance(url, str) or not url.startswith('https://'):
                        self.error('BAD_SOURCE_URL', 'External sources require an HTTPS URL', ident)
                    if not _date(obj.get('checked_at')):
                        self.error('MISSING_SOURCE_DATE', 'External sources require checked_at (YYYY-MM-DD)', ident)
                elif not (conversation and _text(obj.get('locator'))):
                    self.error('MISSING_SOURCE', 'Source needs a repository path, HTTPS URL, or conversation locator', ident)
            elif domain == 'business' and cls != 'Section':
                classification = obj.get('classification')
                if not isinstance(classification, str) or classification not in BP_CLASSES:
                    self.error('BAD_CLASSIFICATION', f'Unknown classification {classification}', ident)
                elif not isinstance(obj.get('verification'), str) or obj['verification'] not in BP_VERIFICATION[classification]:
                    self.error('BAD_VERIFICATION', f'Verification incompatible with {classification}', ident)
                id_classes = {'BP-FACT-': {'decision', 'evidence'}, 'BP-HYP-': {'hypothesis'},
                              'BP-UNKNOWN-': {'unknown'}, 'BP-EXP-': {'experiment'}, 'BP-DATA-': {'evidence'}}
                for prefix, permitted in id_classes.items():
                    if ident.startswith(prefix) and (not isinstance(classification, str) or classification not in permitted):
                        self.error('ID_CLASS_MISMATCH', f'{prefix} IDs cannot change classification', ident)
                for field in ('type', 'description', 'limit'):
                    if not _text(obj.get(field)):
                        self.error('MISSING_FIELD', f'{field} is required', ident)
                if obj.get('type') == 'external_quantitative_indicator':
                    value = obj.get('value')
                    valid_value = _number(value) or (isinstance(value, list) and len(value) == 2 and all(_number(v) for v in value) and value[0] <= value[1])
                    if classification != 'evidence' or obj.get('verification') != 'source_documented':
                        self.error('BAD_METRIC_STATUS', 'External indicators must be source-documented evidence', ident)
                    if not valid_value:
                        self.error('BAD_METRIC_VALUE', 'value must be a finite number or ordered two-number range', ident)
                    for field in ('unit', 'period', 'limit'):
                        if not _text(obj.get(field)):
                            self.error('MISSING_METRIC_FIELD', f'{field} is required', ident)
                    if not _date(obj.get('checked_at')):
                        self.error('BAD_METRIC_DATE', 'checked_at must be YYYY-MM-DD', ident)
            elif domain == 'business' and cls == 'Section':
                if not _text(obj.get('writing_goal')):
                    self.error('MISSING_FIELD', 'Section requires writing_goal', ident)
            elif domain == 'presentation':
                if cls not in PPT_TYPES - {'Source'}:
                    self.error('BAD_CLASS', f'Unknown presentation type {cls}', ident)
                if not isinstance(obj.get('status'), str) or obj['status'] not in PPT_STATUSES:
                    self.error('BAD_STATUS', f'Unknown presentation status {obj.get("status")}', ident)
                if cls == 'Claim' and not _text(obj.get('qualification')):
                    self.error('MISSING_FIELD', 'Claim requires qualification', ident)
                if cls != 'Claim' and isinstance(obj.get('status'), str) and obj['status'] in {'reported_external', 'reported_test', 'documented_decision', 'hypothesis'}:
                    self.error('BAD_STATUS', f'{cls} cannot have claim status', ident)
        edge_seen = set()
        for edge in self.edges:
            key = (edge['domain'], edge['type'], edge['from'], edge['to'])
            if key in edge_seen:
                self.error('DUPLICATE_EDGE', str(key), edge['from'])
            edge_seen.add(key)
            source, target = self.nodes.get(edge['from']), self.nodes.get(edge['to'])
            if not source or not target:
                self.error('BROKEN_EDGE', f"{edge['from']} -> {edge['to']}", edge['from'])
                continue
            rule = RELATIONS.get((edge['domain'], edge['type']))
            if not rule:
                self.error('UNKNOWN_RELATION', f"{edge['domain']}.{edge['type']}", edge['from'])
                continue
            if source['class'] not in rule[0] or target['class'] not in rule[1]:
                self.error('RELATION_TYPE_MISMATCH', f"{source['class']} {edge['type']} {target['class']}", edge['from'])
            if edge['domain'] == 'cross':
                if source['domain'] != 'presentation' or target['domain'] != 'business':
                    self.error('RELATION_DOMAIN_MISMATCH', 'Cross-reference must point presentation -> business', edge['from'])
                if source['class'] == 'Claim' and edge['type'] in {'same_topic', 'related_scope'}:
                    claim_status = source['data'].get('status')
                    compatible = {'documented_decision': {'Decision'}, 'reported_test': {'Evidence'},
                                  'reported_external': {'Evidence'}, 'hypothesis': {'Hypothesis'}, 'unknown': {'Unknown'}}
                    if isinstance(claim_status, str) and claim_status in compatible and target['class'] not in compatible[claim_status]:
                        self.error('CROSS_STATUS_MISMATCH', f"{claim_status} cannot reference {target['class']}", edge['from'])
            elif source['domain'] != edge['domain'] or target['domain'] != edge['domain']:
                self.error('RELATION_DOMAIN_MISMATCH', f"{edge['domain']} relation must remain in its domain", edge['from'])
        # Iterative DFS reports cycles without imposing DAG constraints on
        # visualizes/checks/addresses association edges.
        adjacency = defaultdict(list)
        for edge in self.edges:
            if edge['type'] in ACYCLIC_RELATIONS and (edge['domain'], edge['type']) in RELATIONS and edge['from'] in self.nodes and edge['to'] in self.nodes:
                adjacency[edge['from']].append(edge['to'])
        visited, active = set(), set()
        for start in self.nodes:
            if start in visited:
                continue
            visited.add(start)
            active.add(start)
            stack = [(start, iter(adjacency[start]))]
            while stack:
                current, children = stack[-1]
                target = next(children, None)
                if target is None:
                    active.remove(current)
                    stack.pop()
                elif target in active:
                    self.error('CIRCULAR_DEPENDENCY', f'Dependency cycle includes {current} -> {target}', current)
                elif target not in visited:
                    visited.add(target)
                    active.add(target)
                    stack.append((target, iter(adjacency[target])))
        outgoing = defaultdict(list)
        for edge in self.edges:
            outgoing[edge['from']].append(edge)
        for ident, node in self.nodes.items():
            obj, cls, domain = node['data'], node['class'], node['domain']
            edges = outgoing[ident]
            if domain == 'business' and cls in {'Decision', 'Evidence', 'Hypothesis'}:
                if not any(e['domain'] == 'business' and e['type'] == 'supported_by' for e in edges):
                    self.error('MISSING_EVIDENCE', 'Decision, evidence or hypothesis needs a source', ident)
            if domain == 'presentation' and cls == 'Claim':
                if not any((e['domain'] == 'presentation' and e['type'] == 'supported_by') or (e['domain'] == 'cross' and e['type'] in {'same_topic', 'related_scope'}) for e in edges):
                    self.error('MISSING_EVIDENCE', 'Claim needs a source or a business reference', ident)
                if obj.get('status') == 'reported_external':
                    references = [e for e in edges if e['domain'] == 'cross' and e['type'] == 'same_topic']
                    if len(references) != 1:
                        self.error('MISSING_METRIC_REFERENCE', 'External claim needs exactly one same_topic business reference', ident)
                    else:
                        target = self.nodes.get(references[0]['to'])
                        if target and target['data'].get('type') == 'external_quantitative_indicator':
                            snapshot = obj.get('metric_snapshot')
                            expected = {key: target['data'].get(key) for key in ('value', 'unit', 'period')}
                            if not isinstance(snapshot, dict) or snapshot != expected:
                                self.error('STALE_METRIC_SNAPSHOT', f"Snapshot differs from {target['id']} value/unit/period", ident)
                        elif target:
                            self.error('BAD_METRIC_REFERENCE', 'External claim must reference an external quantitative indicator', ident)
        ppt = self.documents['presentation']
        for ident in self._array(ppt.get('deck_outline'), 'presentation.deck_outline'):
            node = self.nodes.get(ident) if isinstance(ident, str) else None
            if not node or node['domain'] != 'presentation' or node['class'] != 'Slide':
                self.error('BAD_OUTLINE', f'Deck item is not a slide: {ident}')
        for step in self._array(ppt.get('production_workflow'), 'presentation.production_workflow'):
            if not isinstance(step, dict):
                self.error('BAD_WORKFLOW', 'Workflow step must be an object')
                continue
            for field in ('uses', 'needs'):
                if field not in step:
                    continue
                for ident in self._array(step[field], f'workflow.{field}'):
                    node = self.nodes.get(ident) if isinstance(ident, str) else None
                    if not node or node['domain'] != 'presentation':
                        self.error('BAD_WORKFLOW', f'Workflow references missing presentation ID: {ident}')
        for path in self._array(self.documents['business'].get('research_documents'), 'business.research_documents'):
            file = self._file(path)
            if not file or not file.is_file():
                self.error('MISSING_DOCUMENT', f'No repository document: {path}')

    def reachable(self, roots: list[str], reverse: bool = False) -> tuple[list[str], list[dict[str, str]]]:
        adjacency = defaultdict(list)
        for edge in self.edges:
            if edge['from'] in self.nodes and edge['to'] in self.nodes:
                adjacency[edge['to'] if reverse else edge['from']].append(edge)
        seen, queue, used = set(roots), deque(roots), []
        while queue:
            current = queue.popleft()
            for edge in adjacency[current]:
                used.append(edge)
                next_id = edge['from'] if reverse else edge['to']
                if next_id not in seen:
                    seen.add(next_id)
                    queue.append(next_id)
        return sorted(seen), used

    def result(self, ids: list[str], edges: list[dict[str, str]]) -> dict[str, Any]:
        return {'scope': 'business and presentation JSON only', 'nodes': [self.nodes[i] for i in ids], 'edges': edges,
                'limitations': ['No external source refresh, semantic proof, project_kit integration, or automatic document regeneration.',
                                'Free-text claims, Markdown and exported PPT numbers are not compared with metric snapshots.']}

    def context(self, task: str) -> dict[str, Any]:
        roots = ([i for i, n in self.nodes.items() if n['domain'] == 'business' and n['class'] == 'Section']
                 if task == 'business' else [i for i, n in self.nodes.items() if n['domain'] == 'presentation' and n['class'] == 'Slide'])
        ids, edges = self.reachable(roots)
        result = self.result(ids, edges)
        result['task'] = task
        if task == 'pitch':
            result['deck_outline'] = list(self.documents['presentation']['deck_outline'])
        paths = {BUSINESS_PATH, PRESENTATION_PATH}
        for ident in ids:
            node = self.nodes[ident]
            if node['class'] == 'Source' and node['data'].get('path'):
                paths.add(node['data']['path'])
        hashes = {}
        for path in sorted(paths):
            resolved = self._file(path)
            if not resolved or not resolved.is_file():
                raise ValueError(f'Cannot snapshot repository file: {path}')
            hashes[path] = _digest_file(resolved)
        result['receipt'] = {'schema_version': 1, 'files': hashes, 'context_sha256': _digest_object(result),
                             'limitations': ['Byte hashes detect local changes only; URL freshness, source truth, and user conversation cannot be verified.',
                                             'This receipt is not a digital signature; it cannot authenticate a document or its author.']}
        return result

    def check_context(self, path: Path) -> dict[str, Any]:
        problems = []
        try:
            with path.open(encoding='utf-8-sig') as stream:
                context = json.load(stream)
            if not isinstance(context, dict) or not isinstance(context.get('receipt'), dict):
                raise ValueError('context must be a JSON object containing a receipt')
            receipt = context['receipt']
            if receipt.get('schema_version') != 1 or not isinstance(receipt.get('files'), dict):
                raise ValueError('unsupported receipt schema')
            body = {k: v for k, v in context.items() if k != 'receipt'}
            if _digest_object(body) != receipt.get('context_sha256'):
                problems.append({'code': 'CONTEXT_MODIFIED', 'detail': 'Context body differs from recorded digest'})
            task = context.get('task')
            if task not in {'business', 'pitch'}:
                raise ValueError('invalid context task')
            for file, expected in receipt['files'].items():
                resolved = self._file(file)
                if not resolved or not resolved.is_file() or not isinstance(expected, str) or _digest_file(resolved) != expected:
                    problems.append({'code': 'STALE_FILE', 'detail': f'Changed, missing or invalid file: {file}'})
            if not any(error['code'] in {'LOAD_ERROR', 'BAD_PATH', 'INVALID_ARRAY', 'DUPLICATE_ID'} for error in self.errors):
                try:
                    current = self.context(task)
                    if set(receipt['files']) != set(current['receipt']['files']):
                        problems.append({'code': 'SOURCE_SET_CHANGED', 'detail': 'Context local source file set changed'})
                except (OSError, ValueError, TypeError) as exc:
                    problems.append({'code': 'SOURCE_SET_UNAVAILABLE', 'detail': str(exc)})
        except (OSError, UnicodeError, ValueError, TypeError, KeyError) as exc:
            problems.append({'code': 'INVALID_RECEIPT', 'detail': str(exc)})
        if self.errors:
            problems.append({'code': 'INVALID_GRAPH', 'detail': 'Current graph failed validation'})
        return {'valid': not problems, 'errors': problems, 'graph_errors': self.errors,
                'limitations': ['URL freshness, external content, and user conversation are not checked.',
                                'Hashes detect changes but do not authenticate the receipt or confirm claims are true.']}


def _emit(data: Any, as_json: bool) -> None:
    if as_json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        if isinstance(data, dict) and 'nodes' in data:
            print(f"Scope: {data['scope']}")
            for node in data['nodes']:
                print(f"{node['id']} [{node['domain']}/{node['class']}] {node['data'].get('title', '')}")
                details = node['data']
                for field in ('classification', 'verification', 'status', 'description', 'writing_goal', 'value', 'unit', 'period', 'checked_at', 'limit', 'qualification', 'limitation', 'path', 'url', 'locator', 'metric_snapshot'):
                    if field in details and details[field] is not None:
                        print(f"    {field}: {details[field]}")
            for edge in data.get('edges', []):
                print(f"  {edge['from']} --{edge['type']}--> {edge['to']}")
            for item in data.get('limitations', []):
                print(f'LIMIT: {item}')
        else:
            print(json.dumps(data, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT, help='Repository root (default: inferred from script path)')
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ('validate', 'show', 'search', 'impact', 'context', 'context-check'):
        sub = commands.add_parser(name)
        sub.add_argument('--json', action='store_true', help='Emit structured JSON')
        if name in ('show', 'impact'):
            sub.add_argument('id')
        elif name == 'context-check':
            sub.add_argument('path', type=Path, help='UTF-8 JSON saved from context --json')
        elif name == 'search':
            sub.add_argument('query')
        elif name == 'context':
            sub.add_argument('--task', required=True, choices=('business', 'pitch'))
    args = parser.parse_args(argv)
    graph = Graph(args.root)
    if args.command == 'validate':
        _emit({'valid': not graph.errors, 'node_count': len(graph.nodes), 'edge_count': len(graph.edges),
               'scope': 'business and presentation JSON only', 'errors': graph.errors,
               'limitations': ['Validation checks declared structural constraints, not source truth or current external data.']}, args.json)
        return 1 if graph.errors else 0
    if args.command == 'context-check':
        checked = graph.check_context(args.path)
        _emit(checked, args.json)
        return 0 if checked['valid'] else 1
    if any(e['code'] in {'LOAD_ERROR', 'BAD_PATH', 'INVALID_ARRAY', 'DUPLICATE_ID'} for e in graph.errors):
        _emit({'error': 'Cannot traverse malformed graph', 'errors': graph.errors}, args.json)
        return 1
    if args.command == 'context' and graph.errors:
        _emit({'error': 'Context blocked by graph validation errors', 'errors': graph.errors}, args.json)
        return 1
    if args.command == 'search':
        query = args.query.casefold()
        if not query.strip():
            _emit({'error': 'Search query must not be empty'}, args.json)
            return 2
        ids = sorted(i for i, n in graph.nodes.items() if query in json.dumps(n['data'], ensure_ascii=False).casefold())
        _emit(graph.result(ids, []), args.json)
        return 0
    if args.command in {'show', 'impact'}:
        if args.id not in graph.nodes:
            _emit({'error': f'Unknown ID: {args.id}'}, args.json)
            return 2
        ids, edges = graph.reachable([args.id], reverse=args.command == 'impact')
        result = graph.result(ids, edges)
        if graph.errors:
            result['validation_errors'] = graph.errors
        _emit(result, args.json)
        return 0
    try:
        result = graph.context(args.task)
    except (OSError, ValueError, TypeError) as exc:
        _emit({'error': f'Unable to snapshot context: {exc}'}, args.json)
        return 1
    _emit(result, args.json)
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
