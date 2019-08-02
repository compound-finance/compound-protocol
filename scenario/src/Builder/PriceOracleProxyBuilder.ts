import {Event} from '../Event';
import {addAction, World} from '../World';
import {PriceOracleProxy} from '../Contract/PriceOracleProxy';
import {Invokation} from '../Invokation';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {storeAndSaveContract} from '../Networks';
import {getContract} from '../Contract';
import {getAddressV} from '../CoreValue';
import {AddressV} from '../Value';

const PriceOracleProxyContract = getContract("PriceOracleProxy");

export async function buildPriceOracleProxy(world: World, from: string, event: Event): Promise<{world: World, priceOracleProxy: PriceOracleProxy, invokation: Invokation<PriceOracleProxy>}> {
  const fetchers = [
    new Fetcher<{comptroller: AddressV, priceOracle: AddressV, cEther: AddressV}, Invokation<PriceOracleProxy>>(`
        #### Price Oracle Proxy

        * "" - The Price Oracle which proxies to a backing oracle
        * E.g. "PriceOracleProxy Deploy (Unitroller Address) (PriceOracle Address (CToken cETH Address))"
      `,
      "PriceOracleProxy",
      [
        new Arg("comptroller", getAddressV),
        new Arg("priceOracle", getAddressV),
        new Arg("cEther", getAddressV)
      ],
      (world, {comptroller, priceOracle, cEther}) => {
        return PriceOracleProxyContract.deploy<PriceOracleProxy>(world, from, [comptroller.val, priceOracle.val, cEther.val]);
      },
      {catchall: true}
    )
  ];

  let invokation = await getFetcherValue<any, Invokation<PriceOracleProxy>>("DeployPriceOracleProxy", fetchers, world, event);

  if (invokation.error) {
    throw invokation.error;
  }
  const priceOracleProxy = invokation.value!;

  world = await storeAndSaveContract(
    world,
    priceOracleProxy,
    'PriceOracleProxy',
    invokation,
    []
  );

  return {world, priceOracleProxy, invokation};
}
