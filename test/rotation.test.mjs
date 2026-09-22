// npm test — rotation rules and catalog sanity
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickExercises } from '../src/frontend/rotation.js';
import { EXERCISES, EQUIPMENT } from '../src/frontend/exercises.js';

test('catalog entries are complete', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`); ids.add(e.id);
    assert.ok(EQUIPMENT.includes(e.equipment), e.id);
    assert.ok(e.name.en && e.name.pt, e.id);
    assert.equal(e.cues.en.length, e.cues.pt.length, e.id);
    assert.ok(['reps', 'time'].includes(e.mode), e.id);
    assert.ok(e.sets > 0 && e.amount > 0, e.id);
    assert.ok(e.frames.length >= 2, e.id);
  }
  for (const eq of EQUIPMENT) assert.ok(EXERCISES.some((e) => e.equipment === eq), `no ${eq} moves`);
});

test('never repeats the previous group or a recent move', () => {
  let recent = [];
  for (let i = 0; i < 500; i++) {
    const [id] = pickExercises(EXERCISES, recent, 1);
    const ex = EXERCISES.find((e) => e.id === id);
    if (recent.length) {
      const prev = EXERCISES.find((e) => e.id === recent[0]);
      assert.notEqual(ex.group, prev.group, `${prev.id} -> ${id}`);
      assert.ok(!recent.slice(0, 8).includes(id), `${id} repeated too soon`);
    }
    recent = [id, ...recent].slice(0, 12);
  }
});

test('circuits have distinct moves and groups', () => {
  for (let i = 0; i < 200; i++) {
    const ids = pickExercises(EXERCISES, [], 3);
    const groups = ids.map((id) => EXERCISES.find((e) => e.id === id).group);
    assert.equal(new Set(ids).size, 3);
    assert.equal(new Set(groups).size, 3);
  }
});

test('tiny pools relax instead of failing', () => {
  const rope = EXERCISES.filter((e) => e.equipment === 'rope');
  let recent = [];
  for (let i = 0; i < 20; i++) {
    const ids = pickExercises(rope, recent, 3);
    assert.equal(ids.length, 3);
    recent = [...ids, ...recent];
  }
  assert.deepEqual(pickExercises([], [], 2), []);
});

test('exclude is honoured when possible (swap)', () => {
  for (let i = 0; i < 100; i++) {
    const [id] = pickExercises(EXERCISES, [], 1, ['burpee']);
    assert.notEqual(id, 'burpee');
  }
});
