export const OVERLAY_STYLES = `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    color: #e0e0e0;
  }

  .koikatu-tooltip {
    position: fixed;
    background: rgba(30, 30, 40, 0.95);
    border: 1px solid rgba(160, 130, 200, 0.5);
    border-radius: 8px;
    padding: 10px 14px;
    max-width: 320px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    animation: koikatu-fadein 0.15s ease-out;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .koikatu-tooltip .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .koikatu-tooltip .name {
    font-weight: 600;
    font-size: 15px;
    color: #fff;
  }

  .koikatu-tooltip .product {
    font-size: 12px;
    color: #a0a0b0;
  }

  .kkex-badge {
    display: inline-block;
    background: rgba(220, 160, 60, 0.25);
    color: #e0b040;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 4px;
    vertical-align: middle;
  }

  .koikatu-panel-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: koikatu-fadein 0.2s ease-out;
  }

  .koikatu-panel {
    background: #1e1e28;
    border: 1px solid rgba(160, 130, 200, 0.4);
    border-radius: 12px;
    padding: 24px;
    min-width: 340px;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    animation: koikatu-slidein 0.2s ease-out;
  }

  .koikatu-panel .panel-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .koikatu-panel .face-img-large {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid rgba(160, 130, 200, 0.3);
  }

  .koikatu-panel .header-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .koikatu-panel .name {
    font-weight: 700;
    font-size: 18px;
    color: #fff;
  }

  .koikatu-panel .product {
    font-size: 13px;
    color: #a0a0b0;
  }

  .koikatu-panel .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .koikatu-panel .detail-label {
    color: #808090;
    font-size: 13px;
  }

  .koikatu-panel .detail-value {
    color: #d0d0e0;
    font-size: 13px;
  }

  .koikatu-panel .blocks-section {
    margin-top: 12px;
  }

  .koikatu-panel .blocks-toggle {
    background: none;
    border: none;
    color: #a082c8;
    cursor: pointer;
    font-size: 13px;
    padding: 4px 0;
    text-align: left;
    width: 100%;
  }

  .koikatu-panel .blocks-toggle:hover {
    color: #c0a0e8;
  }

  .koikatu-panel .blocks-list {
    margin-top: 6px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-size: 12px;
    color: #909098;
    line-height: 1.6;
    display: none;
  }

  .koikatu-panel .blocks-list.open {
    display: block;
  }

  .koikatu-panel .panel-actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .koikatu-panel .btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid rgba(160, 130, 200, 0.4);
    background: rgba(160, 130, 200, 0.15);
    color: #c0a0e8;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
  }

  .koikatu-panel .btn:hover {
    background: rgba(160, 130, 200, 0.3);
  }

  .koikatu-panel .btn-close {
    background: rgba(100, 100, 120, 0.2);
    color: #a0a0b0;
    border-color: rgba(100, 100, 120, 0.3);
  }

  .koikatu-panel .btn-close:hover {
    background: rgba(100, 100, 120, 0.35);
  }

  @keyframes koikatu-fadein {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes koikatu-slidein {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
