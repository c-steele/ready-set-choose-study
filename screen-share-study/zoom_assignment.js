(function installZoomAssignment(globalObject) {
  const roleSets = [
    { value: "woman", label: "Woman role set", set: "role" },
    { value: "man", label: "Man role set", set: "role" },
    { value: "family", label: "Family/teacher role set", set: "family" },
  ];
  const events = ["HUG", "FOOD", "HELP"];

  function stableHash(text) {
    let hash = 2166136261;
    const input = String(text || "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function assignmentForKey(key) {
    const hash = stableHash(key);
    const roleIndex = hash % roleSets.length;
    const eventIndex = Math.floor(hash / roleSets.length) % events.length;
    return {
      hash,
      cell: eventIndex * roleSets.length + roleIndex,
      role: roleSets[roleIndex],
      event: events[eventIndex],
    };
  }

  globalObject.FTCZoomAssignment = Object.freeze({
    roleSets,
    events,
    stableHash,
    assignmentForKey,
  });
})(window);
