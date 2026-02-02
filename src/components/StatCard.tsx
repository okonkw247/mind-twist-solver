interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

const StatCard = ({ label, value, className = '' }: StatCardProps) => {
  return (
    <div className={`stat-card ${className}`}>
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </div>
  );
};

export default StatCard;
