/** Kyiv wall-clock time without an offset ("2026-09-26T11:40:13.194") → ISO in UTC. */
export function kyivTimeToIso(value: string): string {
   // already ends with an offset ("…Z" or "…+03:00"): nothing to convert
   if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) return new Date(value).toISOString();
   const asUtc = new Date(`${value.slice(0, 23)}Z`); // JS dates keep milliseconds only
   const offsetMinutes = timeZoneOffsetMinutes(asUtc, "Europe/Kyiv");
   return new Date(asUtc.getTime() - offsetMinutes * 60_000).toISOString();
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
   const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
   const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? ""); // "GMT+03:00" → sign, hours, minutes
   if (!m) return 0;
   return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}
