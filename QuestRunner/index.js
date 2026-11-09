// lang: JS, file: index.js, target: ShiggyCord 1.4.2 / Bunny, Discord 351.11

const storage = vendetta.plugin.storage;

function getSetting(key, def) {
    const v = storage[key];
    return v === undefined || v === null ? def : v;
}
function setSetting(key, val) {
    storage[key] = val;
}

let QuestStore        = null;
let RestAPI           = null;
let sendVideoProgress = null;
let sendHeartbeat     = null;
let enrollQuest       = null;

function discoverModules() {
    try { QuestStore = vendetta.metro.findByProps("quests", "excludedQuests"); } catch(_) {}
    try { RestAPI    = vendetta.metro.findByProps("get", "post", "put", "patch"); } catch(_) {}
}

function statusLine() {
    const found   = [];
    const missing = [];
    (QuestStore        ? found : missing).push("QuestStore");
    (RestAPI           ? found : missing).push("RestAPI");
    (sendVideoProgress ? found : missing).push("videoProgress");
    (sendHeartbeat     ? found : missing).push("heartbeat");
    (enrollQuest       ? found : missing).push("enroll");
    return "\u2713 " + (found.join(", ") || "none") +
           (missing.length ? "  \u2717 " + missing.join(", ") : "");
}

const React = vendetta.metro.findByProps("createElement", "useState");
const RN    = vendetta.metro.findByProps("ScrollView", "View")
           || vendetta.metro.common.ReactNative;
const { View, Text, ScrollView, TouchableOpacity } = RN;

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
        }, React.createElement(Text, { style: { color: "#fff", fontSize: 16 } }, "-")),
        React.createElement(TouchableOpacity, {
            onPress: () => value < max && onChange(Math.round((value + step) * 10) / 10),
            style: { paddingHorizontal: 14, paddingVertical: 6,
                     backgroundColor: "#5865F2", borderRadius: 6 }
        }, React.createElement(Text, { style: { color: "#fff", fontSize: 16 } }, "+"))
    );
}

function SettingsPage() {
    const [concurrency, setConcurrency] = React.useState(getSetting("concurrency", 1));
    const [speed, setSpeed]             = React.useState(getSetting("speed", 1.0));

    return React.createElement(ScrollView, {
        style: { flex: 1, backgroundColor: "#1e1f22", padding: 16 }
    },
        React.createElement(View, {
            style: { backgroundColor: "#2b2d31", borderRadius: 8,
                     padding: 10, marginBottom: 16 }
        },
            React.createElement(Text, {
                style: { color: "#b5bac1", fontSize: 11 }
            }, "STATUS"),
            React.createElement(Text, {
                style: { color: "#dbdee1", fontSize: 12, marginTop: 4 }
            }, statusLine())
        ),
        React.createElement(View, {
            style: { backgroundColor: "#2b2d31", borderRadius: 8,
                     padding: 12, marginBottom: 12 }
        },
            React.createElement(Text, { style: { color: "#b5bac1", fontSize: 11, marginBottom: 4 } },
                "SIMULTANEOUS QUESTS"),
            React.createElement(StepControl, {
                label: "Quests", value: concurrency, min: 1, max: 5, step: 1,
                onChange: v => { setConcurrency(v); setSetting("concurrency", v); },
                format: v => v + ""
            }),
            React.createElement(Text, { style: { color: "#7c8290", fontSize: 11, marginTop: 4 } },
                "1 is safest.")
        ),
        React.createElement(View, {
            style: { backgroundColor: "#2b2d31", borderRadius: 8,
                     padding: 12, marginBottom: 12 }
        },
            React.createElement(Text, { style: { color: "#b5bac1", fontSize: 11, marginBottom: 4 } },
                "PROGRESS SPEED"),
            React.createElement(StepControl, {
                label: "Speed", value: speed, min: 1.0, max: 3.0, step: 0.5,
                onChange: v => { setSpeed(v); setSetting("speed", v); },
                format: v => v.toFixed(1) + "x"
            }),
            React.createElement(Text, { style: { color: "#7c8290", fontSize: 11, marginTop: 4 } },
                "Capped by real time. 10-min quest still takes 10 min.")
        ),
        React.createElement(Text, {
            style: { color: "#4f545c", fontSize: 10, textAlign: "center", marginTop: 8 }
        }, "QuestRunner v0.1.0")
    );
}

export function start() {
    discoverModules();
}

export function stop() {}

export { SettingsPage as settings };
