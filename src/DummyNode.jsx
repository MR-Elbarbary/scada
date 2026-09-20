export default function DummyNode({ id = 'DUMMY-01', label = 'Dummy Node', onClick }) {
  return (
    <div className="dummy-node" onClick={(event) => { event.stopPropagation(); onClick?.(id); }}>
      <span className="dummy-node-circle" aria-hidden="true" />
    </div>
  );
}