import { useEffect, useState } from 'react';
import { products } from '../../data/products';
import { trackGameEvent } from '../../utils/analytics';

interface MerchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MerchModal({ isOpen, onClose }: MerchModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsHiding(false);
    } else if (isVisible) {
      setIsHiding(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsHiding(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  const overlayClass = `modal-overlay ${isHiding ? 'hide-modal' : 'show-modal'}`;

  return (
    <div id="merch-modal" className={overlayClass} onClick={onClose}>
      <div className="modal-container modal-container--merch" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">// MERCH</h2>
            <div className="modal-decoration"></div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close merch shop">
            ✕
          </button>
        </div>

        <div className="modal-content">
          <p className="merch-intro">
            Rep the scramble. Every purchase helps keep daily puzzles coming.
          </p>

          <div className="merch-grid">
            {products.map((product) => (
              <a
                key={product.id}
                className="merch-card"
                href={product.fourthwallUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackGameEvent.merchProductClick(product.id)}
              >
                <div className="merch-card-image">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                </div>
                <div className="merch-card-body">
                  <div className="merch-card-top">
                    <span className="merch-card-name">{product.name}</span>
                    <span className="merch-card-price">{product.price}</span>
                  </div>
                  <p className="merch-card-tagline">{product.tagline}</p>
                  <span className="merch-card-buy">
                    BUY <span className="merch-card-arrow">{String.fromCodePoint(0x2192)}</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
