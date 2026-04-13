import { toast } from 'sonner';

export function handleApiError(error: any, context?: string) {
  const message = error.response?.data?.detail
    || error.message
    || 'Erro inesperado. Tente novamente.';

  if (context) {
    toast.error(`Erro ao ${context}: ${message}`);
  } else {
    toast.error(message);
  }

  console.error(`[API Error] ${context || 'Unknown'}:`, error);
}
