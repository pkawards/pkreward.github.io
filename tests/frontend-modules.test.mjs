import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPendingRewardsPrintHTML } from '../js/reports/pending-rewards.js';
import { bindActions } from '../js/ui/events.js';

test('delegated actions let an evidence button stop its enclosing row from opening', () => {
    const listeners = {};
    const root = {
        addEventListener(type, listener) {
            listeners[type] = listener;
        }
    };
    const calls = [];
    const row = { getAttribute: () => 'openRow' };
    const button = {
        getAttribute: () => 'openEvidence',
        parentElement: { closest: () => row }
    };
    const event = {
        target: { closest: () => button },
        cancelBubble: false,
        stopPropagation() {
            this.cancelBubble = true;
        }
    };
    bindActions(root, {
        openRow: () => calls.push('row'),
        openEvidence(_element, click) {
            calls.push('evidence');
            click.stopPropagation();
        }
    });

    listeners.click(event);
    assert.deepEqual(calls, ['evidence']);
});

test('the PDF builder uses the pending items supplied by its caller', () => {
    const ranking = [
        { competition: 'School award', level: 'ระดับโรงเรียน', onBehalfOf: ['Math'] },
        {
            competition: 'International award',
            level: 'ระดับนานาชาติ',
            onBehalfOf: ['Math'],
            students: [{ name: 'Student A', grade: '1', room: '2' }],
            teachers: [{ name: 'Teacher A' }]
        }
    ];
    const report = buildPendingRewardsPrintHTML(ranking);

    assert.match(report, /รางวัลเชิดชูเกียรติที่รอรับ/);
    assert.equal((report.match(/<tbody>/g) || []).length, 2);
    assert.match(report, /<td>Student A<\/td><td>1<\/td><td>2<\/td>/);
    assert.match(report, /Teacher A/);
    assert.ok(report.indexOf('International award') < report.indexOf('School award'));
    assert.equal(ranking[0].competition, 'School award');
});
