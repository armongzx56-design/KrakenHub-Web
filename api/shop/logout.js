module.exports = (req, res) => {
  res.writeHead(302, {
    'Set-Cookie': 'kraken_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    'Location': '/'
  });
  res.end();
};
