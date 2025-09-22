import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  // Logo original é widescreen (14174x1773), ratio ~8:1
  const sizeClasses = {
    sm: 'h-6 w-auto max-w-48',
    md: 'h-8 w-auto max-w-64', 
    lg: 'h-12 w-auto max-w-96'
  };

  const dimensions = {
    sm: { width: 192, height: 24 },
    md: { width: 256, height: 32 },
    lg: { width: 384, height: 48 }
  };

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <Image
        src="/logo.png"
        alt="ContratosCS Logo"
        width={dimensions[size].width}
        height={dimensions[size].height}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  );
};

export default Logo;