import { getAllElements } from '../../utils/dom.js';
import pagerHbs from './pager.hbs';

export function pagerTemplate(mix: string = '', current: number, total: number) {
    const segments = Array.from({ length: total }, (_, index) => {
        return index + 1 === current ? 'current' : 'todo';
    });

    return pagerHbs({ mix, segments });
}

export function changeCurrentPager(pager: HTMLElement, index: number) {
    const segments = getAllElements(pager, '.pager__segment');

    segments.forEach((segment) => segment.classList.remove('pager__segment_current'));
    segments[index].classList.add('pager__segment_current');
}
