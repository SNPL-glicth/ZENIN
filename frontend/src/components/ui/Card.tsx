import { ReactNode, ComponentType } from 'react';
import { LucideProps } from 'lucide-react';

export interface CardProps {
  children: ReactNode;
  title?: string;
  icon?: ComponentType<LucideProps>;
  className?: string;
  shadow?: boolean;
}

export const Card = ({ children, title, icon: Icon, className = '', shadow = true }: CardProps): React.ReactElement => {
  return (
    <div
      className={`bg-white border-2 border-black p-6 ${
        shadow ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : ''
      } ${className}`}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={20} className="text-black" />}
          {title && <h2 className="text-lg font-bold">{title}</h2>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
