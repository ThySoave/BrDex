// Jest setup file
// Node 20 has no native WebSocket; @supabase/supabase-js realtime requires one.
if (typeof global.WebSocket === "undefined") {
  global.WebSocket = require("ws");
}
