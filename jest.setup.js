// Jest setup file
// React Native code expects the __DEV__ global set by Metro.
global.__DEV__ = true;
// Node 20 has no native WebSocket; @supabase/supabase-js realtime requires one.
if (typeof global.WebSocket === "undefined") {
  global.WebSocket = require("ws");
}
