import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      <Image
        src="/logo.png"
        alt="ContratosCS Logo"
        width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
        height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
        className="object-cover w-full h-full"
        priority
      />
    </div>
  );
};

export default Logo;