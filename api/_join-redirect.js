module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = (req.query.code || '').trim().toUpperCase();

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Join Arrow Escape Battle</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #F6F1E8;
          color: #37474F;
          text-align: center;
          padding: 50px 20px;
          margin: 0;
        }
        .container {
          max-width: 440px;
          margin: 0 auto;
          background: #FFFFFF;
          padding: 35px 25px;
          border-radius: 24px;
          box-shadow: 0 10px 25px rgba(106, 68, 40, 0.08);
          border: 1.5px solid rgba(106, 68, 40, 0.06);
        }
        .icon {
          font-size: 64px;
          margin-bottom: 10px;
        }
        h2 {
          color: #6A4428;
          font-size: 26px;
          font-weight: 800;
          margin-top: 0;
          margin-bottom: 16px;
          letter-spacing: 0.5px;
        }
        p {
          font-size: 16px;
          line-height: 24px;
          color: #6A5B52;
          margin-bottom: 24px;
        }
        .code-box {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 4px;
          color: #6A4428;
          background-color: #F9F7F5;
          border: 2px dashed rgba(106, 68, 40, 0.2);
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 24px;
          display: inline-block;
          min-width: 140px;
        }
        .btn {
          display: inline-block;
          background-color: #6A4428;
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 800;
          padding: 16px 36px;
          border-radius: 30px;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(106, 68, 40, 0.2);
          transition: transform 0.1s ease;
        }
        .btn:active {
          transform: scale(0.97);
        }
        .hint {
          font-size: 13px;
          color: #90A4AE;
          margin-top: 24px;
          line-height: 18px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚔️</div>
        <h2>Battle Arena Invitation</h2>
        <p>You have been invited to join a multiplayer match!</p>
        
        <div class="code-box">${code}</div>
        
        <div>
          <a class="btn" href="arrowescape://join/${code}">Open Game & Join</a>
        </div>
        
        <p class="hint">
          If the game doesn't open automatically, make sure you have the <strong>Arrow Escape</strong> app installed on your phone.
        </p>
      </div>

      <script>
        // Automatically redirect to custom scheme after page loads
        setTimeout(function() {
          window.location.href = "arrowescape://join/${code}";
        }, 300);
      </script>
    </body>
    </html>
  `);
};
