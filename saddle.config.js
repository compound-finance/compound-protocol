
module.exports = {
  // solc: "solc",                                          // Solc command to run
  solc_args: ['--allow-paths','contracts,tests/Contracts'], // Extra solc args
  solc_shell_args: {                                        // Args passed to `exec`, see:
    maxBuffer: 1024 * 500000,                               // https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
    shell: '/bin/bash'
  },
  // build_dir: ".build",                                   // Directory to place built contracts
  // coverage_dir: "coverage",                              // Directory to place coverage files
  // coverage_ignore: [],                                   // List of files to ignore for coverage
  contracts: "{contracts,tests/Contracts}/*.sol",           // Glob to match contract files
  // TODO: Separate contracts for test?
  tests: ['**/tests/{,**/}*Test.js'],                             // Glob to match test files
  networks: {                                               // Define configuration for each network
    development: {
      providers: [                                          // How to load provider (processed in order)
        {env: "PROVIDER"},                                  // Try to load Http provider from `PROVIDER` env variable (e.g. env PROVIDER=http://...)
        {http: "http://127.0.0.1:8545"}                     // Fallback to localhost provider
      ],
      web3: {                                               // Web3 options for immediate confirmation in development mode
        gas: [
          {env: "GAS"},
          {default: "6700000"}
        ],
        gas_price: [
          {env: "GAS_PRICE"},
          {default: "20000"}
        ],
        options: {
          transactionConfirmationBlocks: 1,
          transactionBlockTimeout: 5
        }
      },
      accounts: [                                           // How to load default account for transactions
        {env: "ACCOUNT"},                                   // Load from `ACCOUNT` env variable (e.g. env ACCOUNT=0x...)
        {unlocked: 0}                                       // Else, try to grab first "unlocked" account from provider
      ]
    },
    test: {
      providers: [
        {ganache: {
          gasLimit: 20000000,
          gasPrice: 20000,
          defaultBalanceEther: 1000000000,
          allowUnlimitedContractSize: true
        }}
      ],
      web3: {
        gas: [
          {env: "GAS"},
          {default: "20000000"}
        ],
        gas_price: [
          {env: "GAS_PRICE"},
          {default: "12000000002"}
        ],
        options: {
          transactionConfirmationBlocks: 1,
          transactionBlockTimeout: 5
        }
      },
      accounts: [
        {env: "ACCOUNT"},
        {unlocked: 0}
      ]
    }
  },
  rinkeby: {
    providers: [
      {env: "PROVIDER"},
      {file: "~/.ethereum/rinkeby-url"},                    // Load from given file with contents as the URL (e.g. https://infura.io/api-key)
      {http: "https://rinkeby.infura.io"}
    ],
    web3: {
      gas: [
        {env: "GAS"},
        {default: "4600000"}
      ],
      gas_price: [
        {env: "GAS_PRICE"},
        {default: "12000000000"}
      ],
      options: {
        transactionConfirmationBlocks: 1,
        transactionBlockTimeout: 5
      }
    },
    accounts: [
      {env: "ACCOUNT"},
      {file: "~/.ethereum/rinkeby"}                         // Load from given file with contents as the private key (e.g. 0x...)
    ]
  }
}
