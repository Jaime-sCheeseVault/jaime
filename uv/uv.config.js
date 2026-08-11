self.__uv$config = {
    prefix: "/uv/service/",
    bare: "https://sramjet-test.onrender.com/bare/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: "/uv/uv.handler.js",
    client: "/uv/uv.client.js",
    bundle: "/uv/uv.bundle.js"
};