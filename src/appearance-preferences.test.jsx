// @vitest-environment jsdom
import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, expect, it} from 'vitest';
import {appearanceKey, useAppearancePreferences} from './appearance-preferences.js';
const defaults={theme:'auto',density:'comfortable'};
beforeEach(()=>localStorage.clear());
afterEach(()=>cleanup());
it('restores explicit light mode after remounting',()=>{
  const first=renderHook(()=>useAppearancePreferences({id:1},defaults));
  act(()=>first.result.current[1]('theme','light'));
  first.unmount();
  const next=renderHook(()=>useAppearancePreferences({id:1},defaults));
  expect(next.result.current[0].theme).toBe('light');
});
it('keeps preferences separate when changing accounts or logging out',()=>{
  const hook=renderHook(({user})=>useAppearancePreferences(user,defaults),{initialProps:{user:{id:1}}});
  act(()=>hook.result.current[1]({theme:'light',density:'compact'}));
  hook.rerender({user:{id:2}});
  expect(hook.result.current[0]).toEqual(defaults);
  act(()=>hook.result.current[1]('theme','dark'));
  hook.rerender({user:null});expect(hook.result.current[0]).toEqual(defaults);
  hook.rerender({user:{id:1}});expect(hook.result.current[0]).toEqual({theme:'light',density:'compact'});
  hook.rerender({user:{id:2}});expect(hook.result.current[0].theme).toBe('dark');
});
it('ignores corrupt preferences and synchronizes changes from another tab',()=>{
  const key=appearanceKey({id:1});localStorage.setItem(key,'broken');
  const hook=renderHook(()=>useAppearancePreferences({id:1},defaults));
  expect(hook.result.current[0]).toEqual(defaults);
  act(()=>{localStorage.setItem(key,JSON.stringify({theme:'light',density:'invalid'}));window.dispatchEvent(new StorageEvent('storage',{key}));});
  expect(hook.result.current[0]).toEqual({...defaults,theme:'light'});
});
