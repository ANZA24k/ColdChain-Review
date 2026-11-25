export const policy = {
  name: "Chilled shipment · agreed handling policy",
  start: 1795478400,
  end: 1795482000,
  min_mc: 2000,
  max_mc: 8000,
  hard_min_mc: 0,
  hard_max_mc: 15000,
  max_excursion_s: 300,
  max_total_s: 600,
  max_gap_s: 600,
  exception_clause:
    "A single unloading excursion up to 900 seconds at or below 10000 milli-Celsius is permitted if the incident report identifies unloading, states the duration, and confirms the shipment remained sealed. No other excursion is permitted.",
};
export const evidence = {
  source: "Synthetic training fixture CCR-001; not a real sensor attestation.",
  readings: [
    [1795478400, 4500],
    [1795479000, 5000],
    [1795479600, 9000],
    [1795480200, 5000],
    [1795480800, 4500],
    [1795481400, 4500],
    [1795482000, 4500],
  ],
  incident:
    "During unloading, the sealed shipment reached 9°C for 600 seconds. The shipment remained sealed throughout unloading.",
};
export const compliantEvidence = {
  ...evidence,
  readings: evidence.readings.map(([t]) => [t, 4500]),
  incident: "",
};
