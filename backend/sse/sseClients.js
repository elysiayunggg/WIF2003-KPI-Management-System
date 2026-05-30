// In-memory registry of active SSE connections, keyed by userId string.
// Each userId maps to a Set of Express response objects — one per open tab.
const clients = new Map();

function addClient(userId, res) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
}

function removeClient(userId, res) {
  const key = String(userId);
  const set = clients.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(key);
}

// Serialises a notification document and writes it to every open connection
// for the target user. Silent no-op if the user has no active connections.
function pushToUser(userId, notification) {
  const set = clients.get(String(userId));
  if (!set || set.size === 0) return;
  const payload = "data: " + JSON.stringify(notification) + "\n\n";
  set.forEach(function (res) {
    res.write(payload);
  });
}

module.exports = { addClient, removeClient, pushToUser };
