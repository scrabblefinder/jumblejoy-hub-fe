import { Link } from 'react-router-dom';

interface JumbleWord {
  id: string;
  jumbled_word: string;
  answer: string;
}

interface JumblePuzzleProps {
  date: string;
  words: JumbleWord[];
  caption: string;
  imageUrl: string;
  solution?: string;
  finalJumble?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const JumblePuzzle = ({ 
  date, 
  words, 
  caption, 
  imageUrl, 
  solution, 
  finalJumble,
  isExpanded, 
  onToggle 
}: JumblePuzzleProps) => {
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden mb-8">
      <div className="bg-[#0275d8] text-white p-4 text-xl flex justify-between items-center">
        <Link to="#" className="hover:underline w-full text-center">
          Daily Jumble {date} Answers
        </Link>
        {onToggle && (
          <button onClick={onToggle} className="text-2xl hover:opacity-80 transition-opacity focus:outline-none ml-2">
            {isExpanded ? '-' : '+'}
          </button>
        )}
      </div>
      <div className={`${!isExpanded ? 'hidden' : ''}`}>
        <div className="p-4 space-y-4 border-x border-b">
          <div className="flex gap-8">
            <div className="w-3/4 space-y-4">
              {words.map((word) => (
                <Link 
                  key={word.id}
                  to={`/jumble/${word.jumbled_word.toLowerCase()}`}
                  className="block bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-[#0275d8]">
                      {word.jumbled_word}
                    </span>
                    <span className="text-sm text-gray-500">
                      {word.jumbled_word.length} letters
                    </span>
                  </div>
                </Link>
              ))}
              {finalJumble && (
                <Link 
                  to={`/jumble/${finalJumble.toLowerCase()}`}
                  className="block bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-[#0275d8]">
                      {finalJumble}
                    </span>
                    <span className="text-sm text-blue-600 bg-white px-3 py-1 rounded-full">
                      Final Jumble
                    </span>
                  </div>
                </Link>
              )}
            </div>
            <div className="w-1/4 flex flex-col items-center space-y-4">
              <div className="w-[74%]">
                <img 
                  src={imageUrl}
                  alt="Daily Jumble Puzzle" 
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
              <div className="border-t pt-4 w-full">
                <Link 
                  to={`/caption/${createSlug(caption)}`}
                  className="block text-[#0275d8] text-lg hover:underline"
                >
                  {caption}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JumblePuzzle;