import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export const RecoveryDonutChart = ({
  recoverable,
  atRisk,
  lost
}: {
  recoverable: number;
  atRisk: number;
  lost: number;
}) => {
  const data = [
    { name: "Recoverable", value: recoverable, color: "#00a8ff" },
    { name: "At Risk", value: atRisk, color: "#ff7c2a" },
    { name: "Withdrawn/Lost", value: lost, color: "#ff3a3a" }
  ];

  return (
    <div className="panel-card h-[320px] p-5">
      <div className="section-header">Recovery Distribution</div>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={4}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
