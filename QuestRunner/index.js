// lang: JS, file: index.js, target: ShiggyCord 1.4.2 / Bunny, Discord 351.11

(function() {
  "use strict";

  // ── Storage ────────────────────────────────────────────────────────────────
  // Bunny/ShiggyCord exposes the Vendetta storage shim as a global proxy.
  // We gate every read behind a default so cold starts don't throw.
  const storage = vendetta.plugin.storage;

  function getSetting(key, def) {
    const v = storage[key];
    return v === undefined || v === null ? def : v;
  }
  function setSetting(key, val) {
    storage[key] = val;
  }

  // ── Defaults ───────────────────────────────────────────────────────────────
  const DEFAULT_CONCURRENCY = 1;   // simultaneous quests (1-5)
  const DEFAULT_SPEED       = 1.0; // progress speed multiplier (1x-3x)
                                   // NOTE: speed is capped by real elapsed time.
                                   // A 10-min video cannot finish in <10 min.

  // ── Module discovery stubs (filled in Batch 2) ────────────────────────────
  // These will be populated during Batch 2. For now they are null so the
  // Status line can report what is missing.
  let QuestStore       = null;
  let RestAPI          = null;
  let sendVideoProgress = null;
  let sendHeartbeat    = null;
  let enrollQuest      = null;

  function discoverModules() {
    try { QuestStore = vendetta.metro.findByProps("quests", "excludedQuests"); } catch(_) {}
    try { RestAPI    = vendetta.metro.findByProps("get", "post", "put", "patch"); } catch(_) {}
    // Video progress and enroll are discovered in Batch 2.
    // sendVideoProgress = findByProps(...)
    // enrollQuest       = findByProps(...)
  }

  function statusLine() {
    const found  = [];
    const missing = [];
    (QuestStore        ? found : missing).push("QuestStore");
    (RestAPI           ? found : missing).push("RestAPI");
    (sendVideoProgress ? found : missing).push("videoProgress");
    (sendHeartbeat     ? found : missing).push("heartbeat");
    (enrollQuest       ? found : missing).push("enroll");
    return "✓ " + (found.join(", ") || "none") +
           (missing.length ? "  ✗ " + missing.join(", ") : "");
  }

  // ── Settings UI ───────────────────────────────────────────────────────────
  // Bunny/ShiggyCord renders the `settings` export as a React component.
  // We use React Native primitives available on the global React/ReactNative.
  const React = vendetta.metro.findByProps("createElement", "useState");
  const { View, Text, ScrollView, Switch, TouchableOpacity } =
    vendetta.metro.findByProps("ScrollView", "View") ||
    vendetta.metro.common.ReactNative;

  // Simple slider built from TouchableOpacity steps — RN Slider is not
  // reliably available in all Bunny builds. We'll swap to Slider in Batch 3
  // once we confirm the module name on your build.
  function StepControl({ label, value, min, max, step, onChange, format }) {
    return React.createElement(View, {
      style: { flexDirection: "row", alignItems: "center",
               justifyContent: "space-between", paddingVertical: 8 }
    },
      React.createElement(Text, { style: { color: "#fff", flex: 1 } },
        label + ": " + format(value)
      ),
      React.createElement(TouchableOpacity, {
        onPress: () => value > min && onChange(Math.round((value - step) * 10) / 10),
        style: { paddingHorizontal: 14, paddingVertical: 6,
                 backgroundColor: "#5865F2", borderRadius: 6, marginRight: 6 }
      }, React.createElement(Text, { style: { color: "#fff", fontSize: 16 } }, "−")),
      React.createElement(TouchableOpacity, {
        onPress: () => value < max && onChange(Math.round((value + step) * 10) / 10),
        style: { paddingHorizontal: 14, paddingVertical: 6,
                 backgroundColor: "#5865F2", borderRadius: 6 }
      }, React.createElement(Text, { style: { color: "#fff", fontSize: 16 } }, "+"))
    );
  }

  function SettingsPage() {
    const [concurrency, setConcurrency] = React.useState(
      getSetting("concurrency", DEFAULT_CONCURRENCY)
    );
    const [speed, setSpeed] = React.useState(
      getSetting("speed", DEFAULT_SPEED)
    );

    function updateConcurrency(v) {
      setConcurrency(v);
      setSetting("concurrency", v);
    }
    function updateSpeed(v) {
      setSpeed(v);
      setSetting("speed", v);
    }

    return React.createElement(ScrollView, {
      style: { flex: 1, backgroundColor: "#1e1f22", padding: 16 }
    },
      // ── Status line ──────────────────────────────────────────────────────
      React.createElement(View, {
        style: { backgroundColor: "#2b2d31", borderRadius: 8,
                 padding: 10, marginBottom: 16 }
      },
        React.createElement(Text, {
          style: { color: "#b5bac1", fontSize: 11, fontFamily: "monospace" }
        }, "STATUS"),
        React.createElement(Text, {
          style: { color: "#dbdee1", fontSize: 12, marginTop: 4,
                   fontFamily: "monospace" }
        }, statusLine())
      ),

      // ── Concurrency ──────────────────────────────────────────────────────
      React.createElement(View, {
        style: { backgroundColor: "#2b2d31", borderRadius: 8,
                 padding: 12, marginBottom: 12 }
      },
        React.createElement(Text, {
          style: { color: "#b5bac1", fontSize: 11, marginBottom: 4 }
        }, "SIMULTANEOUS QUESTS"),
        React.createElement(StepControl, {
          label: "Quests",
          value: concurrency,
          min: 1, max: 5, step: 1,
          onChange: updateConcurrency,
          format: v => v + "x"
        }),
        React.createElement(Text, {
          style: { color: "#7c8290", fontSize: 11, marginTop: 4 }
        }, "Enroll up to N video quests at once. 1 is safest.")
      ),

      // ── Speed ─────────────────────────────────────────────────────────────
      React.createElement(View, {
        style: { backgroundColor: "#2b2d31", borderRadius: 8,
                 padding: 12, marginBottom: 12 }
      },
        React.createElement(Text, {
          style: { color: "#b5bac1", fontSize: 11, marginBottom: 4 }
        }, "PROGRESS SPEED"),
        React.createElement(StepControl, {
          label: "Speed",
          value: speed,
          min: 1.0, max: 3.0, step: 0.5,
          onChange: updateSpeed,
          format: v => v.toFixed(1) + "x"
        }),
        React.createElement(Text, {
          style: { color: "#7c8290", fontSize: 11, marginTop: 4 }
        }, "How fast to report progress. Capped by real elapsed time — a 10-min quest takes at least 10 min regardless of this setting.")
      ),

      // ── Version ───────────────────────────────────────────────────────────
      React.createElement(Text, {
        style: { color: "#4f545c", fontSize: 10, textAlign: "center",
                 marginTop: 8 }
      }, "QuestRunner v0.1.0 — batch 1/5")
    );
  }

  // ── Plugin lifecycle ──────────────────────────────────────────────────────
  function start() {
    discoverModules();
    // Quest logic is wired in Batch 3.
    // For now, start() just runs discovery so the Status line reflects
    // what modules are present on this Discord build.
  }

  function stop() {
    // Cleanup wired in Batch 3.
  }

  // Export shape Bunny/ShiggyCord expects
  vendetta.plugin.settings = SettingsPage;

  return { start, stop, settings: SettingsPage };
})();
