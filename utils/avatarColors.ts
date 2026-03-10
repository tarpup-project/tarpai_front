// Generate consistent colors for link avatars based on first letter
export function getColorForLetter(letter: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-red-500', text: 'text-white' },
    { bg: 'bg-pink-500', text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-blue-500', text: 'text-white' },
    { bg: 'bg-cyan-500', text: 'text-white' },
    { bg: 'bg-teal-500', text: 'text-white' },
    { bg: 'bg-green-500', text: 'text-white' },
    { bg: 'bg-lime-500', text: 'text-white' },
    { bg: 'bg-yellow-500', text: 'text-gray-900' },
    { bg: 'bg-orange-500', text: 'text-white' },
    { bg: 'bg-rose-500', text: 'text-white' },
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-violet-500', text: 'text-white' },
    { bg: 'bg-fuchsia-500', text: 'text-white' },
  ];

  // Use character code to get consistent color for same letter
  const charCode = letter.toUpperCase().charCodeAt(0);
  const index = charCode % colors.length;
  
  return colors[index];
}
