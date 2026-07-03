export function formatRelativeTime(isoString: string | null | undefined): string {
   if (!isoString || isoString === '-') return 'Nunca atualizado';

   const date = new Date(isoString);
   if (isNaN(date.getTime())) return 'Nunca atualizado';

   const now = new Date();
   const diffMs = now.getTime() - date.getTime();
   
   // Previne pequenas flutuações de relógio do sistema
   const diffSec = Math.max(0, Math.floor(diffMs / 1000));
   const diffMin = Math.floor(diffSec / 60);
   const diffHrs = Math.floor(diffMin / 60);
   const diffDays = Math.floor(diffHrs / 24);

   const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

   if (diffSec < 15) {
      return 'Agora mesmo';
   }
   if (diffSec < 60) {
      return `Há ${diffSec} segundos`;
   }
   if (diffMin < 60) {
      return `Há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
   }
   if (diffHrs < 24) {
      return `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
   }
   if (diffDays === 1) {
      return `Ontem às ${timeStr}`;
   }
   if (diffDays < 7) {
      return `Há ${diffDays} dias`;
   }
   
   const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
   return `${dateStr} às ${timeStr}`;
}
