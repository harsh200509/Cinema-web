export async function onRequest(context: any) {
  return new Response(JSON.stringify({ message: "Hello from Cloudflare Pages Functions!" }), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  });
}
