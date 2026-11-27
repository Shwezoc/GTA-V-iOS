#pragma once

#ifdef __cplusplus
extern "C" {
#endif

void GameTouchBegan(int index, float x, float y);
void GameTouchMoved(int index, float x, float y);
void GameTouchEnded(int index);

#ifdef __cplusplus
}
#endif
