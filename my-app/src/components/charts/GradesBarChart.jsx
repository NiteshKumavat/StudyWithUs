
import React from "react";
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const GradesBarChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="subject" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="completed" fill="#4caf50" name="Completed Tasks" />
        <Bar dataKey="pending" fill="#f44336" name="Pending Tasks" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GradesBarChart;

