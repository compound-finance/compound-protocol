export interface Assert {
  fail(x: any, y: any, reason: string)
  equal(x: any, y: any, reason: string)
  deepEqual(x: any, y: any, reason: string)
}

export const throwAssert: Assert = {
  fail: (x, y, reason) => {
    throw new Error(reason)
  },
  equal: (x, y, reason) => {
    if (x != y) {
      throw new Error(reason);
    }
  },
  deepEqual: (x, y, reason) => {
    if (JSON.stringify(x) != JSON.stringify(y)) {
      throw new Error(reason);
    }
  }
};
