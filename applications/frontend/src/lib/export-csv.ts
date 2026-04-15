export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map(row => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportUsersCsv(users: { id: number; name: string; role: string }[]) {
  downloadCsv(
    "users-export.csv",
    ["ID", "Name", "Role"],
    users.map(u => [String(u.id), u.name, u.role])
  );
}

export function exportMetricsCsv(metrics: {
  requestsByRoute: { name: string; total: number }[];
  requestsByStatusCode: { name: string; total: number }[];
}) {
  const rows: string[][] = [
    ["--- Requests by Route ---", "", ""],
    ...metrics.requestsByRoute.map(r => [r.name, String(r.total), ""]),
    ["", "", ""],
    ["--- Requests by Status Code ---", "", ""],
    ...metrics.requestsByStatusCode.map(s => [s.name, String(s.total), ""]),
  ];
  downloadCsv("metrics-export.csv", ["Key", "Value", ""], rows);
}
