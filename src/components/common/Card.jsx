/** Plain white card. Optional title/description header with right-side actions. */
export default function Card({ title, description, actions, children, className = '', style, animate = true, bodyStyle }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {description && <p className="section-desc">{description}</p>}
          </div>
          {actions && <div className="card-header-actions">{actions}</div>}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
