import { CTASection } from './CTASection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { PreviewSection } from './PreviewSection';

/**
 * HomePage - Main landing page composition.
 *
 * Composes all home sections in order:
 * 1. HeroSection - Brand + primary CTAs
 * 2. FeaturesSection - Key capabilities
 * 3. HowItWorksSection - Platform flow
 * 4. PreviewSection - Dashboard preview
 * 5. CTASection - Final conversion
 *
 * All sections are self-contained and independently maintainable.
 */
export function HomePage(): React.ReactElement {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PreviewSection />
      <CTASection />
    </>
  );
}
