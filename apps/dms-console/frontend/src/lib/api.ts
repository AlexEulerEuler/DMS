export type BackendHealth = {
  status: string;
  service: string;
  version: string;
  environment: string;
};

const apiBaseUrl =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export async function getBackendHealth(): Promise<BackendHealth | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BackendHealth;
  } catch {
    return null;
  }
}
