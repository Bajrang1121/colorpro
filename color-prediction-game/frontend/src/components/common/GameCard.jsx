import React from 'react';

const GameCard = ({ game, onClick }) => {
  return (
    <div 
      className="game-card"
      onClick={onClick}
      style={{
        background: game.color,
        color: 'white',
        textAlign: 'center',
        padding: '20px 10px',
        borderRadius: '10px',
        cursor: 'pointer'
      }}
    >
      <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{game.name}</h3>
      <p style={{ margin: 0, fontSize: '12px' }}>{game.time}</p>
    </div>
  );
};

export default GameCard;