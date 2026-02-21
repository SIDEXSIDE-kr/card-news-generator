import { useState } from 'react';
import InputPage from './pages/InputPage';
import EditorPage from './pages/EditorPage';
import { CardData, DesignConfig, DEFAULT_DESIGN } from './types';

function App() {
  const [page, setPage] = useState<'input' | 'editor'>('input');
  const [cards, setCards] = useState<CardData[]>([]);
  const [design, setDesign] = useState<DesignConfig>(DEFAULT_DESIGN);

  const handleGenerate = (generatedCards: CardData[]) => {
    setCards(generatedCards);
    setPage('editor');
  };

  if (page === 'input') {
    return <InputPage onGenerate={handleGenerate} />;
  }

  return (
    <EditorPage
      cards={cards}
      setCards={setCards}
      design={design}
      setDesign={setDesign}
      onBack={() => setPage('input')}
    />
  );
}

export default App;
