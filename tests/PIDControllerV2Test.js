const {
  encodeParameters,
  etherUnsigned,
  freezeTime,
  keccak256
} = require('./Utils/Ethereum');

describe('PIDController', () => {
  let pid_controller;
  let root;
  let notAdmin;
  let newAdmin;

  beforeEach(async () => {
    [root, notAdmin, newAdmin] = accounts;
    pid_controller = await deploy('PIDControllerV2', [root, delay]); // todo: add parameters for constructor
  });

  describe('xx', () => {
    it.only('xx', async () => {
      let x = await call(pid_controller, 'invert', [1]);
      expect(x).toBe(1)
    });
  });
});
