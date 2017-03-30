import { GeneaprovePage } from './app.po';

describe('geneaprove App', () => {
  let page: GeneaprovePage;

  beforeEach(() => {
    page = new GeneaprovePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('gp works!');
  });
});
