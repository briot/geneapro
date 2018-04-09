import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from '../Store/State';
import { Icon } from 'semantic-ui-react';
import { AssertionList } from '../Store/Assertion';
import { GenealogyEventSet } from '../Store/Event';
import AssertionView from '../Assertions/Assertion';
import './AssertionTimeline.css';

function ageAtDate(refYear?: number, date?: string|null): string {
   // We can't use javascript's Date, since it cannot represent
   // dates before 1970.
   if (refYear && date) {
      const b2 = Number(date.substring(0, 4));
      return `(${b2 - refYear})`;
   }
   return '';
}

interface TimelineProps {
   asserts?: AssertionList;

   hidePersonIf?: number;
   //  If true, do not show the first part of assertions

   refYear?: number;
   //  "age" will be displayed relative to that date
}

interface ConnectedProps extends TimelineProps {
   events: GenealogyEventSet;
}

function ConnectedAssertionTimeline(props: ConnectedProps) {
   if (!props.asserts) {
      return null;
   }

   props.asserts.sortByDate(props.events);

   const list  = props.asserts.get();
   let prev: string|null = '@#@';

   return (
      <table className="AssertionTimeline">
         <tbody>
            {
               list.map(a => {
                  const d = a.getSortDate(props.events);
                  const year = d ? d.substring(0, 4) : null;
                  const isSame = year === prev;
                  prev = year;
                  return (
                     <tr key={a.constructor.name + a.id/* 'P2E<id>' or 'P2C<id>' */}>
                        <td className="date">
                           {
                              isSame ?
                                 null : (
                                 <div>
                                    {year}
                                    <span className="age">
                                       {ageAtDate(props.refYear, d)}
                                    </span>
                                    <Icon name="circle" />
                                 </div>
                              )
                           }
                        </td>
                        <td>
                           <AssertionView assert={a} hidePersonIf={props.hidePersonIf}/>
                        </td>
                     </tr>
                  );
               })
            }
         </tbody>
      </table>
   );
}

const AssertionTimeline = connect(
   (state: AppState, props: TimelineProps) => ({
      ...props,
      events: state.events,
   }),
)(ConnectedAssertionTimeline);
export default AssertionTimeline;
