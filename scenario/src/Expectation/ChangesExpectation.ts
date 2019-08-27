import {Expectation} from '../Expectation';
import {fail, World} from '../World';
import {getCoreValue} from '../CoreValue';
import {Value, NumberV} from '../Value';
import {Event} from '../Event';
import {formatEvent} from '../Formatter';
import {BigNumber} from 'bignumber.js';

function asNumberV(v: Value): NumberV {
  if (v instanceof NumberV) {
    return v;
  } else {
    throw new Error(`Expected NumberV for ChangesExpectation, got ${v.toString()}`);
  }
}

export class ChangesExpectation implements Expectation {
  condition: Event;
  originalValue: NumberV;
  delta: NumberV;
  expected: NumberV;

  constructor(condition: Event, originalValue: Value, delta: Value) {
    this.condition = condition;
    this.originalValue = asNumberV(originalValue);
    this.delta = asNumberV(delta);
    this.expected = this.originalValue.add(this.delta);
  }

  async getCurrentValue(world: World): Promise<Value> {
    return await getCoreValue(world, this.condition);
  };

  async checker(world: World, initialCheck: boolean=false): Promise<void> {
    const currentValue = asNumberV(await this.getCurrentValue(world));

    if (!currentValue.compareTo(world, this.expected)) {
      const trueDelta = currentValue.sub(this.originalValue);

      fail(world, `${this.toString()} instead had value \`${currentValue.toString()}\` (true delta: ${trueDelta.toString()})`);
    }
  }

  toString() {
    return `ChangesExpectation: condition=${formatEvent(this.condition)}, originalValue=${this.originalValue.toString()}, delta=${this.delta.toString()}, expected=${this.expected.toString()}`;
  }
}
