import {Decorator} from '../../annotations/annotations';
import {SourceLightDom, DestinationLightDom, LightDom} from './light_dom';
import {Inject} from 'di/di';
import {Element, Node, DOM} from 'facade/dom';
import {isPresent} from 'facade/lang';
import {List, ListWrapper} from 'facade/collection';
import {NgElement} from 'core/dom/element';

var _scriptTemplate = DOM.createScriptTag('type', 'ng/content')

class ContentStrategy {
  nodes;
  insert(nodes:List<Nodes>){}
}

/**
 * An implementation of the content tag that is used by transcluding components.
 * It is used when the content tag is not a direct child of another component,
 * and thus does not affect redistribution.
 */
class RenderedContent extends ContentStrategy {
  beginScript:Element;
  endScript:Element;
  nodes:List<Node>;

  constructor(el:Element) {
    this._replaceContentElementWithScriptTags(el);
    this.nodes = [];
  }

  insert(nodes:List<Node>) {
    this.nodes = nodes;
    DOM.insertAllBefore(this.endScript, nodes);
    this._removeNodesUntil(ListWrapper.isEmpty(nodes) ? this.endScript : nodes[0]);
  }

  _replaceContentElementWithScriptTags(contentEl:Element) {
    this.beginScript = DOM.clone(_scriptTemplate);
    this.endScript = DOM.clone(_scriptTemplate);

    DOM.insertBefore(contentEl, this.beginScript);
    DOM.insertBefore(contentEl, this.endScript);
    DOM.removeChild(DOM.parentElement(contentEl), contentEl);
  }

  _removeNodesUntil(node:Node) {
    var p = DOM.parentElement(this.beginScript);
    for (var next = DOM.nextSibling(this.beginScript);
         next !== node;
         next = DOM.nextSibling(this.beginScript)) {
      DOM.removeChild(p, next);
    }
  }
}

/**
 * An implementation of the content tag that is used by transcluding components.
 * It is used when the content tag is a direct child of another component,
 * and thus does not get rendered but only affect the distribution of its parent component.
 */
class IntermediateContent extends ContentStrategy {
  destinationLightDom:LightDom;
  nodes:List<Node>;

  constructor(destinationLightDom:LightDom) {
    this.destinationLightDom = destinationLightDom;
    this.nodes = [];
  }

  insert(nodes:List<Node>) {
    this.nodes = nodes;
    this.destinationLightDom.redistribute();
  }
}


@Decorator({
  selector: 'content'
})
export class Content {
  _element:Element;
  select:string;
  _strategy:ContentStrategy;

  constructor(@Inject(DestinationLightDom) destinationLightDom, contentEl:NgElement) {
    this.select = contentEl.getAttribute('select');
    this._strategy = isPresent(destinationLightDom) ?
      new IntermediateContent(destinationLightDom) :
      new RenderedContent(contentEl.domElement);
  }

  nodes():List<Node> {
    return this._strategy.nodes;
  }

  insert(nodes:List<Node>) {
    this._strategy.insert(nodes);
  }
}