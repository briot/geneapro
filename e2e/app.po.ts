import { browser, element, by } from 'protractor';

export class GeneaprovePage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('gp-root h1')).getText();
  }
}
