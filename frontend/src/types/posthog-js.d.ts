declare module "posthog-js" {
  const posthog: {
    init: (apiKey: string, config?: Record<string, unknown>) => void;
    capture: (eventName: string, properties?: Record<string, unknown>) => void;
    identify: (distinctId: string) => void;
  };

  export default posthog;
}
