'use strict';

const PLANS = {
  free:    { limit: 2 },
  starter: { limit: 150 },
  pro:     { limit: 400 },
  agency:  { limit: 900 },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

module.exports = { PLANS, currentMonth };
