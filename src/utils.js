import Arweave from "arweave";

export const ipfsGetEndpoint = "https://ipfs.io/ipfs/";
export const ipfsLinkEndpoint = "https://ipfs.io/api/v0/object/get?arg=";
export const arweaveEndpoint = "https://arweave.net";

const arweave = Arweave.init();

export const buildQuery = (ipfsHash) => `
query {
  transactions(
    tags: { name: "IPFS-Add", values: ["${ipfsHash}"] }
  ) {
    edges {
      node {
        id
      }
    }
  }
}
`;

export const createTweet = (tokenAddress, tokenID) => {
  return `https://twitter.com/intent/tweet?text=Just%20saved%20the%20metadata%20%26%20assets%20of%20NFT%20${tokenAddress}%20Token%20%23${tokenID}%20on%20@ArweaveTeam%20thanks%20to%20@checkmynft.%20If%20your%20NFT%20is%20already%20saved%20on%20IPFS%2C%20you%20can%20pin%20it%20permanently%20on%20Arweave%20for%20free%20at%20https%3A//checkmynft.com`;
};

export const getArweaveIDByCID = async (ipfsHash) => {
  let res = await fetch("https://arweave.dev/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: buildQuery(ipfsHash) }),
  });

  let arweaveResponse = await res.json();
  if (arweaveResponse.data.transactions.edges.length > 0) {
    return arweaveResponse.data.transactions.edges[0].node.id;
  }

  return "";
};

// Example: {"Links":[{"Name":"image.gif","Hash":"QmQ3iNM31YPCCtXphUEL1myFzJ5aX5pJPCpCELFiJAMqiQ","Size":122073}],"Data":"\u0008\u0001"}
export const walkIPFSLinks = async (ipfsHash) => {
  let res = await fetch(ipfsLinkEndpoint + ipfsHash, {
    method: "GET",
  });

  let ipfsResponse = await res.json();
  if (ipfsResponse.Links.length > 0) {
    return walkIPFSLinks(ipfsResponse.Links[0].Hash);
  }
  return ipfsHash;
};

export const deployToIPFS = async (ipfsHash) => {
  const res = await fetch("https://ipfs2arweave.com/permapin/" + ipfsHash, {
    method: "POST",
    // we add no cors and we won't have info on the txID
    mode: "no-cors",
  });

  // const response = await res.json();
  if (res.status > 300) {
    // continue
    throw new Error("Could not deploy to ipfs2arweave " + (await res.text()));
  }
  // return response.arweaveId;
  return;
};

export const isIPFSCID = (hash) => {
  if (hash.substring(0, 2) === "Qm") {
    return true;
  }
  return false;
};

export const getURLFromURI = async (uri) => {
  try {
    if (!uri) {
      return ["", "undefined"];
    }
    // if correct URI we get the protocol
    let url = new URL(uri);
    // if protocol other IPFS -- get the ipfs hash
    if (url.protocol === "ipfs:") {
      // ipfs://ipfs/Qm
      let ipfsHash = url.href.replace("ipfs://ipfs/", "");

      return [ipfsGetEndpoint + ipfsHash, "ipfs"];
    }

    if (url.pathname.includes("ipfs") || url.pathname.includes("Qm")) {
      // /ipfs/QmTtbYLMHaSqkZ7UenwEs9Sri6oUjQgnagktJSnHeWY8iG
      let ipfsHash = url.pathname.replace("/ipfs/", "");

      return [ipfsGetEndpoint + ipfsHash, "ipfs"];
    }

    // otherwise we check if arweave (arweave in the name or arweave.net)
    if (url.hostname === "arweave.net") {
      return [arweaveEndpoint + url.pathname, "arweave"];
    }

    // otherwise it's a centralized uri
    return [uri, "centralized"];
  } catch (e) {
    // it's not a url, we keep checking
    // check if IPFS
    if (isIPFSCID(uri)) {
      return [ipfsGetEndpoint + uri, "ipfs"];
    }

    try {
      // could be an arweave tx ID, check it
      await arweave.transactions.get(uri);
      return [arweaveEndpoint + uri, "arweave"];
    } catch (e) {
      // otherwise we don't know
      return ["", "undefined"];
    }
  }
};

// ARWEAVE example: 0x97F1482116F6459eD7156f1E4fC76b023C9b4BB3
// IPFS example: 0xc6b0b290176aaab958441dcb0c64ad057cbc39a0
// Rari Medium example: 0xd07dc4262bcdbf85190c01c996b4c06a461d2430 with tokenURI: 140082
// Poor from known poor example: 0x06012c8cf97bead5deae237070f9587f8e7a266d
// Poor from centralized example: 0xBe065d51ef9aE7d4550942Fe9C4E948606260C6C
// Good from centralized example (but stored on chain): 0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270 with tokenURI: 22000042

// Cryptokitties 0x06012c8cf97bead5deae237070f9587f8e7a266d (no reference to the tokenURI on the contract)
// Hashmasks 0xC2C747E0F7004F9E8817Db2ca4997657a7746928, they don't store any tokenURI on the blockchain (only a hosted webpage with links to)
export const knownPoor = [
  "0x06012c8cf97bead5deae237070f9587f8e7a266d".toLowerCase(),
  "0xC2C747E0F7004F9E8817Db2ca4997657a7746928".toLowerCase(),
];

export const knownGood = [
  // AvaStars 0xF3E778F839934fC819cFA1040AabaCeCBA01e049 all data is store on chain
  "0xF3E778F839934fC819cFA1040AabaCeCBA01e049".toLowerCase(),
  // infiNFTAlpha, store both on Arweave and IPFS 0xD0c402BCBcB5E70157635C41b2810b42Fe592bb0
  "0xD0c402BCBcB5E70157635C41b2810b42Fe592bb0".toLowerCase(),
  // Artblocks 0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a and 0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270 (store on chain)
  "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a".toLowerCase(),
  // Artblocks 0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a and 0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270 (store on chain)
  "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270".toLowerCase(),
];

// Cryptopunks (store the info SHA256 of the image on the contract, image is not necessarily stored in a distributed fashion)

// TODO check cryptopunks contract!
// let knownMedium = ["0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb".toLowerCase()];
