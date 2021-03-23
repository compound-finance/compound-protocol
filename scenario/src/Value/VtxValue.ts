import { Event } from '../Event';
import { World } from '../World';
import { Vtx } from '../Contract/Vtx';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getVtx } from '../ContractLookup';

export function vtxFetchers() {
  return [
    new Fetcher<{ vtx: Vtx }, AddressV>(`
        #### Address

        * "<Vtx> Address" - Returns the address of Vtx token
          * E.g. "Vtx Address"
      `,
      "Address",
      [
        new Arg("vtx", getVtx, { implicit: true })
      ],
      async (world, { vtx }) => new AddressV(vtx._address)
    ),

    new Fetcher<{ vtx: Vtx }, StringV>(`
        #### Name

        * "<Vtx> Name" - Returns the name of the Vtx token
          * E.g. "Vtx Name"
      `,
      "Name",
      [
        new Arg("vtx", getVtx, { implicit: true })
      ],
      async (world, { vtx }) => new StringV(await vtx.methods.name().call())
    ),

    new Fetcher<{ vtx: Vtx }, StringV>(`
        #### Symbol

        * "<Vtx> Symbol" - Returns the symbol of the Vtx token
          * E.g. "Vtx Symbol"
      `,
      "Symbol",
      [
        new Arg("vtx", getVtx, { implicit: true })
      ],
      async (world, { vtx }) => new StringV(await vtx.methods.symbol().call())
    ),

    new Fetcher<{ vtx: Vtx }, NumberV>(`
        #### Decimals

        * "<Vtx> Decimals" - Returns the number of decimals of the Vtx token
          * E.g. "Vtx Decimals"
      `,
      "Decimals",
      [
        new Arg("vtx", getVtx, { implicit: true })
      ],
      async (world, { vtx }) => new NumberV(await vtx.methods.decimals().call())
    ),

    new Fetcher<{ vtx: Vtx }, NumberV>(`
        #### TotalSupply

        * "Vtx TotalSupply" - Returns Vtx token's total supply
      `,
      "TotalSupply",
      [
        new Arg("vtx", getVtx, { implicit: true })
      ],
      async (world, { vtx }) => new NumberV(await vtx.methods.totalSupply().call())
    ),

    new Fetcher<{ vtx: Vtx, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "Vtx TokenBalance <Address>" - Returns the Vtx token balance of a given address
          * E.g. "Vtx TokenBalance Geoff" - Returns Geoff's Vtx balance
      `,
      "TokenBalance",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { vtx, address }) => new NumberV(await vtx.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ vtx: Vtx, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "Vtx Allowance owner:<Address> spender:<Address>" - Returns the Vtx allowance from owner to spender
          * E.g. "Vtx Allowance Geoff Torrey" - Returns the Vtx allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { vtx, owner, spender }) => new NumberV(await vtx.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ vtx: Vtx, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "Vtx GetCurrentVotes account:<Address>" - Returns the current Vtx votes balance for an account
          * E.g. "Vtx GetCurrentVotes Geoff" - Returns the current Vtx vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { vtx, account }) => new NumberV(await vtx.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ vtx: Vtx, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "Vtx GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current Vtx votes balance at given block
          * E.g. "Vtx GetPriorVotes Geoff 5" - Returns the Vtx vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { vtx, account, blockNumber }) => new NumberV(await vtx.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ vtx: Vtx, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "Vtx GetCurrentVotesBlock account:<Address>" - Returns the current Vtx votes checkpoint block for an account
          * E.g. "Vtx GetCurrentVotesBlock Geoff" - Returns the current Vtx votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { vtx, account }) => {
        const numCheckpoints = Number(await vtx.methods.numCheckpoints(account.val).call());
        const checkpoint = await vtx.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ vtx: Vtx, account: AddressV }, NumberV>(`
        #### VotesLength

        * "Vtx VotesLength account:<Address>" - Returns the Vtx vote checkpoint array length
          * E.g. "Vtx VotesLength Geoff" - Returns the Vtx vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { vtx, account }) => new NumberV(await vtx.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ vtx: Vtx, account: AddressV }, ListV>(`
        #### AllVotes

        * "Vtx AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "Vtx AllVotes Geoff" - Returns the Vtx vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { vtx, account }) => {
        const numCheckpoints = Number(await vtx.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await vtx.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getVtxValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Vtx", vtxFetchers(), world, event);
}
