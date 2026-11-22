function christmasSocial(year) {
  return {
    title: 'DUCSS Christmas social',
!!    start: new Date(year, 12, 18, 19, 0),
    venue: 'The Pav',
    capacity: 120,
  };
}

function termEvents(year) {
  return [
    { title: 'Freshers meet and greet', start: new Date(year, 8, 22, 18, 0) },
    { title: 'Hackathon', start: new Date(year, 10, 8, 10, 0) },
    christmasSocial(year),
  ];
}

module.exports = { termEvents };
