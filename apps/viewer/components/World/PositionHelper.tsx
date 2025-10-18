"use client";

import { useState } from "react";

export function PositionHelper() {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [savedPositions, setSavedPositions] = useState<Array<{ x: number; y: number; name: string }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setCoords({ x, y });
  };

  const savePosition = () => {
    if (coords) {
      const name = prompt("Name this position (e.g., 'Team 1'):");
      if (name) {
        setSavedPositions([...savedPositions, { ...coords, name }]);
      }
    }
  };

  return (
    <>
      <div
        className="absolute inset-0 cursor-crosshair z-50"
        onClick={handleClick}
        style={{ background: "transparent" }}
      />
      
      {coords && (
        <div className="absolute top-4 left-4 z-50 bg-black/90 text-white p-4 rounded border-2 border-green-500 font-mono text-xs">
          <div className="mb-2">
            Click Position: <span className="text-green-400">({coords.x}, {coords.y})</span>
          </div>
          <button
            onClick={savePosition}
            className="bg-green-600 px-2 py-1 rounded text-xs"
          >
            Save This Position
          </button>
          
          {savedPositions.length > 0 && (
            <div className="mt-3 border-t border-gray-600 pt-2">
              <div className="text-gray-400 mb-1">Saved Positions:</div>
              {savedPositions.map((pos, i) => (
                <div key={i} className="text-xs">
                  {pos.name}: ({pos.x}, {pos.y})
                </div>
              ))}
              <button
                onClick={() => {
                  const code = `[\n${savedPositions.map(p => `  { x: ${p.x}, y: ${p.y}, label: "${p.name}" },`).join('\n')}\n]`;
                  navigator.clipboard.writeText(code);
                  alert("Copied to clipboard!");
                }}
                className="bg-blue-600 px-2 py-1 rounded text-xs mt-2"
              >
                Copy Code
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

